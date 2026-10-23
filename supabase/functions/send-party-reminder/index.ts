import { getEvent, eventEmailHeading } from "../_shared/event.ts";
// Send a party reminder email to all ticket buyers for a given edition.
// Requires an authenticated staff session (verify_jwt = true).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));

// Convert plain-text (with blank lines as paragraph breaks) into safe HTML.
function textToHtml(body: string): string {
  const safe = escapeHtml(body.trim());
  const paragraphs = safe.split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#333;">${p.replace(/\n/g, "<br/>")}</p>`
  );
  return paragraphs.join("");
}

function buildEmailHtml(subject: string, body: string, event: Awaited<ReturnType<typeof getEvent>>) {
  const bodyHtml = textToHtml(body);
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:0 auto; padding:0; background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0a0a0a 0%, #1a1208 100%); padding:32px 24px; text-align:center;">
        <p style="margin:0 0 6px; color:#f5a623; font-size:11px; font-weight:bold; letter-spacing:3px; text-transform:uppercase;">${eventEmailHeading(event)}</p>
        <h1 style="margin:0; color:#ffffff; font-size:26px; letter-spacing:1px;">${escapeHtml(event.title)}</h1>
        <p style="margin:8px 0 0; color:#e8728a; font-size:13px;">${escapeHtml(event.date)} · ${escapeHtml(event.venue)}</p>
      </div>
      <div style="padding:32px 28px 24px; background:#ffffff;">
        ${bodyHtml}
      </div>
      <div style="padding:20px 28px; background:#fafafa; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0; font-size:12px; color:#888;">
          You're receiving this because you purchased a ticket for ${escapeHtml(event.edition)}.
        </p>
        <p style="margin:8px 0 0; font-size:12px;">
          <a href="https://otownparty.com" style="color:#f5a623; text-decoration:none;">otownparty.com</a>
        </p>
      </div>
    </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: user } = await supabase.auth.getUser(token);
    if (!user.user) return new Response(JSON.stringify({ error: "Please sign in" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: allowed } = await supabase.rpc("has_role", { _user_id: user.user.id, _role: "admin" });
    if (!allowed) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const activeEvent = await getEvent(supabase);
    const CURRENT_EDITION = activeEvent.edition;
    const defaultSubject = `${CURRENT_EDITION}: Your gate guide`;
    const defaultBody = `Hey Raver,\n\n${activeEvent.title} is calling.\n${activeEvent.date} · ${activeEvent.time}\n${activeEvent.venue}\n\nSave your ticket QR offline and present it at the ticket scan stand. Each ticket scans once. Bring your payment reference for assistance.\n\nLet's Rave!`;
    const body = await req.json().catch(() => ({}));
    const subject = (typeof body?.subject === "string" && body.subject.trim())
      ? body.subject.trim().slice(0, 200)
      : defaultSubject;
    const messageBody = (typeof body?.message === "string" && body.message.trim())
      ? body.message.trim().slice(0, 8000)
      : defaultBody;
    const edition = (typeof body?.edition === "string" && body.edition.trim())
      ? body.edition.trim()
      : CURRENT_EDITION;
    const dryRun = body?.dryRun === true;
    // "all" => every buyer since the first edition; "manual" => explicit list only.
    const audience: "edition" | "all" | "manual" =
      body?.audience === "all" || body?.audience === "manual" ? body.audience : "edition";
    const manualRecipients: string[] = Array.isArray(body?.recipients)
      ? body.recipients.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];

    // Collect unique recipient emails from every source of truth we have.
    const emails = new Set<string>();

    if (audience === "manual") {
      for (const e of manualRecipients) emails.add(e);
    } else {
      const matches = (rowEdition: string | null) =>
        audience === "all" || (rowEdition || CURRENT_EDITION) === edition;

      const { data: intents } = await supabase
        .from("payment_intents")
        .select("buyer_email, edition, status")
        .in("status", ["claimed", "verified"]);
      for (const r of intents || []) {
        if (r.buyer_email && matches(r.edition)) {
          emails.add(String(r.buyer_email).trim().toLowerCase());
        }
      }

      const { data: tks } = await supabase
        .from("tickets")
        .select("buyer_email, edition");
      for (const r of tks || []) {
        if (r.buyer_email && matches(r.edition)) {
          emails.add(String(r.buyer_email).trim().toLowerCase());
        }
      }

      const { data: purchases } = await supabase
        .from("ticket_purchases")
        .select("email, edition, status");
      for (const r of purchases || []) {
        if (r.email && matches(r.edition)) {
          emails.add(String(r.email).trim().toLowerCase());
        }
      }

      // Always include any extra manual addresses the sender typed.
      for (const e of manualRecipients) emails.add(e);
    }

    const recipientList = Array.from(emails).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true, count: recipientList.length, sample: recipientList.slice(0, 5),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = buildEmailHtml(subject, messageBody, await getEvent(supabase, edition));

    let sent = 0;
    let failed = 0;
    const errors: { email: string; error: string }[] = [];

    for (const to of recipientList) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: fromAddress, to: [to], subject, html }),
        });
        if (!res.ok) {
          const t = await res.text();
          failed++;
          errors.push({ email: to, error: `${res.status}: ${t.slice(0, 200)}` });
          console.error("Reminder send failed", to, res.status, t);
        } else {
          sent++;
        }
      } catch (err) {
        failed++;
        errors.push({ email: to, error: (err as Error).message });
      }
      // Gentle throttle to respect Resend's default 2 rps limit.
      await new Promise((r) => setTimeout(r, 550));
    }

    return new Response(JSON.stringify({
      success: true, total: recipientList.length, sent, failed,
      errors: errors.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-party-reminder error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
