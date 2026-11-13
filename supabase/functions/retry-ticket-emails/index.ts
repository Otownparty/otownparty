// Finds paid orders whose ticket email never went through (tickets issued, order not yet "claimed")
// and re-sends the same QR codes. Staff: list / send one / send all. Anyone: small automatic sweep.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const SWEEP_BATCH = 5, STAFF_BATCH = 15, PAUSE_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));
    const action = ["list", "send", "sweep"].includes(body.action) ? body.action : "sweep";
    const reference = typeof body.reference === "string" && /^[A-Za-z0-9_.-]{1,100}$/.test(body.reference) ? body.reference : null;

    if (action !== "sweep") {
      const { data: u } = await createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }).auth.getUser();
      if (!u?.user) return json({ error: "Please sign in" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admins only" }, 403);
    }

    // Undelivered = tickets exist but order never reached "claimed" (claimed is only set after the email is accepted).
    const { data: open } = await admin.from("payment_intents")
      .select("reference, buyer_email, buyer_name, ticket_type, quantity, edition, created_at, email_error, email_attempts, email_last_attempt_at")
      .eq("status", "verified").order("created_at", { ascending: true }).limit(2000);
    const refs = (open ?? []).map((o) => o.reference);
    const ticketsBy = new Map<string, { buyer_name: string; buyer_email: string }>();
    for (let i = 0; i < refs.length; i += 200) {
      const { data: t } = await admin.from("tickets").select("payment_reference, buyer_name, buyer_email").in("payment_reference", refs.slice(i, i + 200));
      for (const r of t ?? []) ticketsBy.set(r.payment_reference, r);
    }
    const undelivered = (open ?? []).filter((o) => ticketsBy.has(o.reference)).map((o) => ({
      ...o, buyer_email: ticketsBy.get(o.reference)!.buyer_email, buyer_name: ticketsBy.get(o.reference)!.buyer_name,
    }));

    if (action === "list") {
      const { data: st } = await admin.from("email_job_state").select("paused_until").eq("id", "tickets").maybeSingle();
      return json({ undelivered: undelivered.reverse(), pausedUntil: st?.paused_until ?? null });
    }

    const nowIso = new Date().toISOString();
    if (action === "sweep") {
      if (!undelivered.length) return json({ sent: 0, remaining: 0 });
      const { data: st } = await admin.from("email_job_state").select("*").eq("id", "tickets").maybeSingle();
      if (st?.paused_until && st.paused_until > nowIso) return json({ sent: 0, paused: true, remaining: undelivered.length });
      // Single-flight lease
      if (!st) await admin.from("email_job_state").insert({ id: "tickets" });
      const { data: got } = await admin.from("email_job_state")
        .update({ lease_until: new Date(Date.now() + 120000).toISOString(), updated_at: nowIso })
        .eq("id", "tickets").or(`lease_until.is.null,lease_until.lt.${nowIso}`).select("id");
      if (!got?.length) return json({ sent: 0, busy: true });
    }

    let queue = reference ? undelivered.filter((u) => u.reference === reference) : undelivered;
    queue = queue.slice(0, action === "sweep" ? SWEEP_BATCH : STAFF_BATCH);
    const results: { reference: string; email: string; ok: boolean; error?: string }[] = [];
    let limited = false;
    for (const o of queue) {
      const r = await fetch(`${url}/functions/v1/claim-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}`, apikey: service },
        body: JSON.stringify({ reference: o.reference, name: o.buyer_name || "Raver", email: o.buyer_email, force: true }),
      });
      const d = await r.json().catch(() => ({}));
      const ok = r.ok && d.emailSent !== false && !d.error;
      const err = ok ? null : String(d.emailError || d.error || `Failed (${r.status})`).slice(0, 300);
      await admin.from("payment_intents").update({
        email_error: err, email_attempts: (o.email_attempts ?? 0) + 1, email_last_attempt_at: new Date().toISOString(),
      }).eq("reference", o.reference);
      results.push({ reference: o.reference, email: o.buyer_email, ok, error: err ?? undefined });
      if (!ok && /\(429\)|429|limit/i.test(err ?? "")) { limited = true; break; }
    }
    await admin.from("email_job_state").upsert({
      id: "tickets", lease_until: null, updated_at: new Date().toISOString(),
      ...(limited ? { paused_until: new Date(Date.now() + PAUSE_MS).toISOString() } : results.some((r) => r.ok) ? { paused_until: null } : {}),
    });
    const sent = results.filter((r) => r.ok).length;
    return json({ sent, results, limited, remaining: undelivered.length - sent });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
