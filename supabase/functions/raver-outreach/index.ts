// Automatic Find A Raver outreach, safe to call often (idempotent, small batches):
//  1. Invite past ticket buyers (any edition) who have no Find A Raver profile — once each.
//  2. "New ravers just dropped" alerts to approved members, max once per 12h each.
// GET ?optout=<email>&sig=<sig> records an opt-out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const SITE = "https://otownparty.com";
const INVITE_BATCH = 20, ALERT_BATCH = 20, ALERT_GAP_MS = 12 * 3600 * 1000;

async function sign(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("QR_SIGNING_SECRET")! + ":optout"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const optoutUrl = async (email: string) =>
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/raver-outreach?optout=${encodeURIComponent(email)}&sig=${await sign(email)}`;

function shell(inner: string, unsub: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#0a0a0a;padding:32px 24px;text-align:center;">
    <p style="margin:0;color:#f5a623;font-size:11px;font-weight:bold;letter-spacing:3px;">OTOWN PARTY · FIND A RAVER 👥</p>
  </div>
  <div style="padding:28px;color:#0a0a0a;">${inner}</div>
  <div style="padding:16px 28px;background:#fafafa;text-align:center;font-size:12px;color:#888;">
    <a href="${unsub}" style="color:#888;">Stop these emails</a> · Ticket emails are never affected.
  </div></div>`;
}
const btn = (label: string) => `<p style="text-align:center;margin:28px 0;"><a href="${SITE}/partner" style="background:#f5a623;color:#0a0a0a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${label}</a></p>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const url = new URL(req.url);

  const optEmail = url.searchParams.get("optout");
  if (optEmail) {
    const email = optEmail.trim().toLowerCase();
    const ok = (await sign(email)) === url.searchParams.get("sig");
    if (ok) await admin.from("raver_email_optouts").upsert({ email });
    return new Response(`<html><body style="background:#0a0a0a;color:#fff;font-family:Arial;text-align:center;padding:60px"><h2 style="color:#f5a623">${ok ? "You're unsubscribed" : "Invalid link"}</h2><p>${ok ? "You won't get Find A Raver invites or alerts anymore. Ticket emails still arrive as normal." : ""}</p></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const ticketFrom = Deno.env.get("RESEND_FROM_EMAIL") || "";
    const m = ticketFrom.match(/@([^<>\s]+?)>?\s*$/);
    const from = Deno.env.get("OTP_FROM_EMAIL") || (m ? `Find A Raver <raver@${m[1]}>` : "Find A Raver <onboarding@resend.dev>");
    const send = async (to: string, subject: string, html: string) => {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }) });
      if (!r.ok) console.error("Resend", to, r.status, await r.text());
      await new Promise((res) => setTimeout(res, 550));
      return r.ok;
    };

    const { data: optRows } = await admin.from("raver_email_optouts").select("email");
    const optouts = new Set((optRows ?? []).map((r) => r.email));

    const { data: profiles } = await admin.from("partner_profiles").select("user_id, status, display_name, created_at, auto_approve_at");
    const userEmails = new Map<string, string>();
    for (let page = 1; page < 50; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of data?.users ?? []) if (u.email) userEmails.set(u.id, u.email.toLowerCase());
      if (!data || data.users.length < 1000) break;
    }
    const memberEmails = new Set((profiles ?? []).map((p) => userEmails.get(p.user_id)).filter(Boolean) as string[]);

    // ---- 1. Invites
    const buyers = new Set<string>();
    const { data: t } = await admin.from("tickets").select("buyer_email").limit(20000);
    for (const r of t ?? []) if (r.buyer_email) buyers.add(r.buyer_email.trim().toLowerCase());
    const { data: tp } = await admin.from("ticket_purchases").select("email").not("paid_at", "is", null).limit(20000);
    for (const r of tp ?? []) if (r.email) buyers.add(r.email.trim().toLowerCase());
    const { data: inv } = await admin.from("raver_invites_sent").select("email").limit(50000);
    const invited = new Set((inv ?? []).map((r) => r.email));
    const body = await req.json().catch(() => ({}));
    const only = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (only) buyers.add(only);
    const pending = [...buyers].filter((e) => !only || e === only).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !invited.has(e) && !optouts.has(e) && !memberEmails.has(e));
    let invitesSent = 0;
    for (const email of pending.slice(0, INVITE_BATCH)) {
      const { data: claimed } = await admin.from("raver_invites_sent").upsert({ email }, { onConflict: "email", ignoreDuplicates: true }).select("email");
      if (!claimed?.length) continue;
      const html = shell(`
        <h1 style="margin:0 0 12px;font-size:26px;">You raved with us. Now find <span style="color:#f5a623">who you'll rave with next.</span> ⚡</h1>
        <p style="font-size:15px;line-height:1.6;">The Otown crowd is already inside <b>Find A Raver 👥</b> — swiping, matching and sliding into voice notes before the next party drops.</p>
        <p style="font-size:15px;line-height:1.6;">🔥 Swipe through real ravers from the Otown community<br/>💬 Match &amp; chat — text or voice notes<br/>🕺 Link up at the gate and faaji together</p>
        <p style="font-size:15px;line-height:1.6;">Sign-up takes one minute: your email, a code, a few pics. That's it.</p>
        ${btn("Find My Raver 👥")}
        <p style="font-size:13px;color:#666;text-align:center;">Don't rave alone. Your people are waiting.</p>`, await optoutUrl(email));
      if (await send(email, "Your next rave partner is already inside 👥⚡", html)) invitesSent++;
      else await admin.from("raver_invites_sent").delete().eq("email", email);
    }

    if (only) return json({ success: true, invitesSent });
    // ---- 2. New-profile alerts
    const now = Date.now();
    const liveAt = (p: { created_at: string; auto_approve_at: string | null }) => new Date(p.auto_approve_at ?? p.created_at).getTime();
    const approved = (profiles ?? []).filter((p) => p.status === "approved" && liveAt(p) <= now);
    const { data: states } = await admin.from("partner_alert_state").select("user_id, last_alert_at");
    const lastAlert = new Map((states ?? []).map((s) => [s.user_id, new Date(s.last_alert_at).getTime()]));
    const { data: swipes } = await admin.from("partner_swipes").select("swiper_id, swiped_id, created_at").limit(100000);
    const swiped = new Map<string, Set<string>>(); const lastSwipe = new Map<string, number>();
    for (const s of swipes ?? []) {
      if (!swiped.has(s.swiper_id)) swiped.set(s.swiper_id, new Set());
      swiped.get(s.swiper_id)!.add(s.swiped_id);
      lastSwipe.set(s.swiper_id, Math.max(lastSwipe.get(s.swiper_id) ?? 0, new Date(s.created_at).getTime()));
    }
    let alertsSent = 0;
    for (const me of approved) {
      if (alertsSent >= ALERT_BATCH) break;
      const email = userEmails.get(me.user_id);
      if (!email || optouts.has(email)) continue;
      const prev = lastAlert.get(me.user_id) ?? 0;
      if (now - prev < ALERT_GAP_MS) continue;
      const mine = swiped.get(me.user_id) ?? new Set();
      const since = Math.max(prev, lastSwipe.get(me.user_id) ?? liveAt(me));
      const fresh = approved.filter((p) => p.user_id !== me.user_id && !mine.has(p.user_id) && liveAt(p) > since);
      if (!fresh.length) continue;
      await admin.from("partner_alert_state").upsert({ user_id: me.user_id, last_alert_at: new Date().toISOString() });
      const n = fresh.length;
      const html = shell(`
        <h1 style="margin:0 0 12px;font-size:24px;">${n === 1 ? "A new raver just" : `${n} new ravers just`} dropped 👀</h1>
        <p style="font-size:15px;line-height:1.6;">Hey ${esc(me.display_name ?? "Raver")}, fresh faces just joined Find A Raver since you last swiped. Get in there before someone else matches first.</p>
        ${btn("Go Swipe 🔥")}`, await optoutUrl(email));
      if (await send(email, n === 1 ? "A new raver just joined 👀" : `${n} new ravers just joined 👀`, html)) alertsSent++;
    }
    return json({ success: true, invitesSent, invitesRemaining: Math.max(0, pending.length - INVITE_BATCH), alertsSent });
  } catch (e) {
    console.error("raver-outreach", e);
    return json({ error: (e as Error).message }, 500);
  }
});
