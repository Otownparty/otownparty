// Admin-only: email every approved Find A Raver profile that hasn't been
// emailed yet. Idempotent — safe to call repeatedly (covers backfill too).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const origin = String(body?.origin ?? "https://otownparty.com").slice(0, 200).replace(/\/$/, "");

    const { data: profiles, error } = await admin.from("partner_profiles")
      .select("id, user_id, display_name").eq("status", "approved").is("approval_emailed_at", null).limit(100);
    if (error) throw error;

    const ticketFrom = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";
    const m = ticketFrom.match(/(?:<)?[^<>@\s]+@([^<>\s]+?)(?:>)?\s*$/);
    const from = Deno.env.get("OTP_FROM_EMAIL") || (m ? `Find A Raver <raver@${m[1]}>` : "Find A Raver <onboarding@resend.dev>");

    let sent = 0; const failed: string[] = [];
    for (const p of profiles ?? []) {
      // Claim the row first so overlapping calls never email the same person twice.
      const { data: claimed } = await admin.from("partner_profiles")
        .update({ approval_emailed_at: new Date().toISOString() })
        .eq("id", p.id).is("approval_emailed_at", null).select("id");
      if (!claimed?.length) continue;
      const { data: u } = await admin.auth.admin.getUserById(p.user_id);
      const to = u?.user?.email;
      if (!to) { failed.push(p.id); continue; } // left claimed: no email to send to
      const name = esc(p.display_name ?? "Raver");
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0a0a;">
          <h1 style="color:#f5a623;margin:0 0 4px;">Otown Party</h1>
          <p style="margin:0 0 24px;color:#666;">Find A Raver 👥</p>
          <p style="font-size:18px;"><b>You're in, ${name}! 🎉</b></p>
          <p style="font-size:15px;line-height:1.5;">Your Find A Raver profile has been approved. You're now live — start swiping, match with other ravers and link up before the party.</p>
          <p style="font-size:14px;color:#444;">When you match and they reply, you two get 24 hours to chat. Make it count!</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${origin}/partner" style="background:#f5a623;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Start swiping</a>
          </p>
          <p style="font-size:12px;color:#888;">Stay safe: meet in public spots and tell a friend where you're going.</p>
        </div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: "You're approved on Find A Raver 🎉", html }),
      });
      if (!res.ok) {
        console.error("Resend error:", p.id, res.status, await res.text());
        failed.push(p.id);
        await admin.from("partner_profiles").update({ approval_emailed_at: null }).eq("id", p.id);
      } else {
        sent++;
      }
      await new Promise((r) => setTimeout(r, 600)); // stay under Resend rate limit
    }
    return json({ success: true, sent, failed: failed.length });
  } catch (err) {
    console.error("notify-partner-approved error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
