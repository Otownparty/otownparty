// Send a party reminder email to all ticket buyers for a given edition.
// Requires an authenticated staff session (verify_jwt = true).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENT_EDITION = "Otown Party 15.0 - Afro All Black Edition";
const EVENT_DATE = "Saturday, 17th October 2026";
const EVENT_TIME = "6PM – 4AM";
const EVENT_VENUE = "Oyo Durbar Stadium, Oyo State";

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

const defaultSubject = `🚨 TONIGHT: Otown Party 15.0 — Afro All Black Edition. Here's your gate guide`;

const defaultBody = `Hey Raver,

Today is the day. 🔥 Otown Party 15.0: Afro All Black Edition takes over ${EVENT_VENUE} TONIGHT.

📅 Today — ${EVENT_DATE}
🕕 Gates open 6PM · Music till 4AM
📍 ${EVENT_VENUE}

HOW TO GET IN — READ THIS BEFORE YOU LEAVE HOME

1. Find your QR code. It was emailed to this exact address when you bought your ticket. Search your inbox for "Otown Party" — check Spam/Promotions too.
2. Save it offline. Screenshot the QR code or download the attached PNG to your gallery. Network at the venue can be slow — don't rely on opening an email at the gate.
3. Turn your screen brightness UP. A dim or cracked screen slows the scanner down. A clean printed copy works perfectly too.
4. At the gate, go to the TICKET SCAN STAND. Hold your QR code flat and steady about 20–30cm from the scanner. Our staff scans it, it turns green, and you're in.
5. One scan per ticket. Each QR is unique and works ONCE. If you bought multiple tickets, each guest needs their own QR — don't share or post it online, whoever scans it first gets the entry.
6. Bring a valid ID that matches the name on your ticket, in case we need to verify.
7. Any issue at the gate? Don't queue twice — step aside to the support desk beside the scan stand with your payment reference and we'll sort you out in seconds.

TO MAKE TONIGHT LEGENDARY

• Arrive early — 6PM to 8PM is the smoothest entry window, and the opening set is worth it.
• Dress the part. The Afro All Black Edition is a whole mood — come in your freshest fit.
• Move with your squad. The energy is always bigger with your people.
• Stay hydrated, pace the drinks, and look out for each other.
• Vendors, food, drinks and shisha are all on ground — come with cash and transfer ready.

Sound system loaded. DJ lineup ready. Lights set. Only one thing missing — you. 🌀

See you on the dancefloor tonight.

— The Otown Party Team`;

function buildEmailHtml(subject: string, body: string) {
  const bodyHtml = textToHtml(body);
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:0 auto; padding:0; background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0a0a0a 0%, #1a1208 100%); padding:32px 24px; text-align:center;">
        <p style="margin:0 0 6px; color:#f5a623; font-size:11px; font-weight:bold; letter-spacing:3px; text-transform:uppercase;">Otown Party 15.0</p>
        <h1 style="margin:0; color:#ffffff; font-size:26px; letter-spacing:1px;">Afro All Black Edition</h1>
        <p style="margin:8px 0 0; color:#e8728a; font-size:13px;">${EVENT_DATE} · ${EVENT_VENUE}</p>
      </div>
      <div style="padding:32px 28px 24px; background:#ffffff;">
        ${bodyHtml}
      </div>
      <div style="padding:20px 28px; background:#fafafa; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0; font-size:12px; color:#888;">
          You're receiving this because you purchased a ticket for ${escapeHtml(CURRENT_EDITION)}.
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

    const html = buildEmailHtml(subject, messageBody);

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
