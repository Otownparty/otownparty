// Admin-only: produce a concise, neutral AI review summary of a Find A Raver applicant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...extra, "Content-Type": "application/json" } });

const SYSTEM = `You help event staff review dating-profile applications for a rave party's "Find A Raver" feature.
Write a concise, neutral review summary (max ~120 words) in this format:
Summary: 1-2 sentences describing the applicant factually.
Completeness: what is filled in or missing.
Flags: anything staff should check (inappropriate content, contact details/links in bio, signs of being under 18, spam, reports). Say "None noticed" if none.
Do not judge attractiveness, do not recommend approve/reject, avoid assumptions about the person.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const { profileId, notes } = await req.json().catch(() => ({}));
    if (typeof profileId !== "string" || profileId.length > 64) return json({ error: "profileId required" }, 400);
    const extraNotes = typeof notes === "string" ? notes.slice(0, 2000) : "";

    const { data: p } = await admin.from("partner_profiles")
      .select("user_id, display_name, age, gender, looking_for, bio, photo_urls, status, created_at")
      .eq("id", profileId).maybeSingle();
    if (!p) return json({ error: "Profile not found" }, 404);
    const { data: reports } = await admin.from("partner_reports")
      .select("reason, details").eq("reported_id", p.user_id).limit(20);

    const input = [
      `Display name: ${p.display_name ?? "(none)"}`,
      `Age: ${p.age ?? "(none)"}`,
      `Gender: ${p.gender ?? "(none)"}`,
      `Looking for: ${(p.looking_for ?? []).join(", ") || "(none)"}`,
      `Bio: ${p.bio ?? "(none)"}`,
      `Photos uploaded: ${(p.photo_urls ?? []).length}`,
      `Current status: ${p.status}`,
      `Reports against them: ${(reports ?? []).length ? reports!.map((r) => `${r.reason ?? ""} ${r.details ?? ""}`.trim()).join(" | ") : "none"}`,
      extraNotes ? `Extra answers/notes from staff: ${extraNotes}` : "",
    ].filter(Boolean).join("\n");

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    const runId = res.headers.get("X-Lovable-AIG-Run-ID");
    const fwd: Record<string, string> = runId ? { "X-Lovable-AIG-Run-ID": runId } : {};

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || err?.message ||
        (res.status === 429 ? "AI is busy, try again in a minute" : res.status === 402 ? "AI credits have run out" : "AI request failed");
      return json({ error: msg }, res.status, fwd);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", failure = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.failed" || ev.type === "error")
            failure = ev.response?.error?.message || ev.message || "AI request failed";
        } catch { /* ignore partial */ }
      }
    }
    if (!text.trim()) return json({ error: failure || "The AI didn't return a summary" }, 502, fwd);
    return json({ summary: text.trim() }, 200, fwd);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
