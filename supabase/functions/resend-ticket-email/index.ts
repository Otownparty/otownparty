// Admin-only: manually re-send ticket QR emails to a buyer, from the same sender used for ticket delivery.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CURRENT_EDITION = "Otown Party 15.0 - Afro All Black Edition";

async function qrAttachment(payload: string, filename: string) {
  const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(payload)}`);
  if (!res.ok) throw new Error(`QR image generation failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { filename, content: btoa(bin) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const scope = body.scope === "all" ? "all" : "current";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: "Enter a valid email" }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "Email sending isn't configured" }, 500);
    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";

    let tq = admin.from("tickets").select("*").ilike("buyer_email", email).order("ticket_index");
    if (scope === "current") tq = tq.eq("edition", CURRENT_EDITION);
    const { data: tickets, error: tErr } = await tq;
    if (tErr) throw tErr;

    // Paid orders where tickets were never created — finish them through the normal claim step.
    let iq = admin.from("payment_intents").select("reference, buyer_name, edition").ilike("buyer_email", email).eq("status", "verified");
    if (scope === "current") iq = iq.eq("edition", CURRENT_EDITION);
    const { data: intents } = await iq;
    const haveRefs = new Set((tickets ?? []).map((t) => t.payment_reference));
    const missing = (intents ?? []).filter((i) => !haveRefs.has(i.reference));

    const results: { reference: string; ok: boolean; count: number; error?: string }[] = [];

    for (const m of missing) {
      const r = await fetch(`${url}/functions/v1/claim-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}`, apikey: service },
        body: JSON.stringify({ reference: m.reference, name: m.buyer_name || "Raver", email, force: true }),
      });
      const d = await r.json().catch(() => ({}));
      const ok = r.ok && (d.emailSent !== false) && !d.error;
      results.push({ reference: m.reference, ok, count: d.ticketCount ?? 0, error: ok ? undefined : (d.emailError || d.error || `Failed (${r.status})`) });
    }

    const groups = new Map<string, any[]>();
    for (const t of tickets ?? []) {
      if (!groups.has(t.payment_reference)) groups.set(t.payment_reference, []);
      groups.get(t.payment_reference)!.push(t);
    }

    for (const [reference, list] of groups) {
      try {
        const first = list[0];
        const name = String(first.buyer_name);
        const payloads = list.map((t) => {
          const p = { tid: t.id, n: t.buyer_name, e: t.buyer_email, t: t.ticket_type, a: t.amount_paid, q: t.quantity, i: t.ticket_index, ed: t.edition, r: t.payment_reference };
          return { idx: t.ticket_index, used: t.used, payload: JSON.stringify({ ...p, sig: t.qr_signature }) };
        });
        const qty = first.quantity;
        const ticketHtml = payloads.map(({ idx, payload, used }) => `
          <div style="border:1px solid #eee; border-radius:12px; padding:20px; margin:16px 0; text-align:center; background:#fafafa;">
            <p style="margin:0 0 8px; color:#666; font-size:13px;">Ticket ${idx} of ${qty}${used ? " · already scanned" : ""}</p>
            <h3 style="margin:0 0 12px; color:#0a0a0a;">${first.ticket_type}</h3>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(payload)}" alt="QR Code" width="280" height="280" style="display:block; margin:0 auto; max-width:280px;" />
            <p style="margin:12px 0 0; font-size:12px; color:#888;">Show this QR at the gate</p>
          </div>`).join("");
        const attachments = await Promise.all(payloads.map(({ payload, idx }) => qrAttachment(payload, `otown-party-ticket-${idx}.png`)));
        const editionLabel = String(first.edition).replace(" - ", " · ");
        const html = `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0a0a0a;">
            <h1 style="color:#f5a623; margin:0 0 4px;">${editionLabel}</h1>
            <p style="margin:0 0 24px; color:#666;">Here are your tickets again — sorry for the delay!</p>
            <p>Hi ${name.replace(/[<>]/g, "")},</p>
            <p>Below ${list.length > 1 ? `are your ${list.length} tickets` : "is your ticket"}. Each QR code is unique — present it at the gate for scanning.</p>
            ${ticketHtml}
            <p style="margin-top:24px; font-size:13px; color:#666;">Payment reference: ${reference}</p>
          </div>`;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddress, to: [email], subject: `Your ${editionLabel.split(" · ")[0]} Ticket${list.length > 1 ? "s" : ""} 🎉`, html, attachments }),
        });
        if (!r.ok) {
          const t = await r.text();
          results.push({ reference, ok: false, count: list.length, error: r.status === 429 ? "Email limit reached — try again later" : `Email failed (${r.status}): ${t.slice(0, 200)}` });
        } else results.push({ reference, ok: true, count: list.length });
      } catch (e) {
        results.push({ reference, ok: false, count: list.length, error: (e as Error).message });
      }
    }

    if (!results.length) return json({ error: scope === "current" ? "No paid tickets found for this email in the current edition" : "No paid tickets found for this email" }, 404);
    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
