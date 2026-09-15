// Paystack webhook + manual reissue endpoint.
// Server-side ticket issuance that does NOT depend on the buyer's browser tab staying open.
//
// Flow:
//   1. Paystack POSTs charge.success to this URL with HMAC-SHA512 signature in `x-paystack-signature`.
//   2. We look up the matching payment_intent.
//   3. If not already claimed, we verify with Paystack, then call the internal claim logic
//      using buyer info captured at init time (or pulled from Paystack metadata as fallback).
//
// Also supports manual admin invocation: POST { reference, name?, email? } with the service role
// key as Authorization to backfill orphan payments.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const enc = new TextEncoder();
const emailRegex = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function qrAttachment(payload: string, filename: string) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(payload)}`;
  const response = await fetch(qrUrl);
  if (!response.ok) throw new Error(`QR image generation failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { filename, content: btoa(binary) };
}

async function issueTicketsAndEmail(opts: {
  supabase: ReturnType<typeof createClient>;
  intent: any;
  name: string;
  email: string;
  signingSecret: string;
  resendKey: string;
  fromAddress: string;
}): Promise<{ emailSent: boolean; emailError?: string }> {
  const { supabase, intent, name, email, signingSecret, resendKey, fromAddress } = opts;
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const edition = intent.edition || "Otown Party 15.0 - Afro All Black Edition";
  const unitPrice = intent.unit_price;
  const ticketType = intent.ticket_type;
  const quantity = intent.quantity;
  const reference = intent.reference;

  const qrPayloads: { payload: string; ticketIndex: number }[] = [];
  const { data: existingTickets, error: existingErr } = await supabase
    .from("tickets")
    .select("id, ticket_index, qr_signature")
    .eq("payment_reference", reference)
    .order("ticket_index");
  if (existingErr) throw existingErr;
  if (existingTickets?.length && existingTickets.length !== quantity) {
    throw new Error(`Ticket issuance incomplete: expected ${quantity}, found ${existingTickets.length}`);
  }

  const ticketRows: any[] = [];
  const sourceTickets = existingTickets?.length
    ? existingTickets
    : Array.from({ length: quantity }, (_, index) => ({
        id: crypto.randomUUID(), ticket_index: index + 1, qr_signature: "",
      }));

  for (const ticket of sourceTickets) {
    const ticketId = ticket.id;
    const i = ticket.ticket_index;
    const payloadObj = {
      tid: ticketId, n: cleanName, e: cleanEmail, t: ticketType,
      a: unitPrice, q: quantity, i, ed: edition, r: reference,
    };
    const payloadJson = JSON.stringify(payloadObj);
    const sig = ticket.qr_signature || await hmacSign(signingSecret, payloadJson);
    const fullPayload = JSON.stringify({ ...payloadObj, sig });

    if (!existingTickets?.length) {
      ticketRows.push({
        id: ticketId,
        payment_reference: reference,
        ticket_type: ticketType,
        amount_paid: unitPrice,
        quantity, ticket_index: i,
        buyer_name: cleanName,
        buyer_email: cleanEmail,
        edition,
        qr_signature: sig,
      });
    }
    qrPayloads.push({ payload: fullPayload, ticketIndex: i });
  }

  if (ticketRows.length) {
    const { error: insertErr } = await supabase.from("tickets").insert(ticketRows);
    if (insertErr) throw insertErr;
  }

  const ticketHtml = qrPayloads.map(({ payload, ticketIndex }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(payload)}`;
    return `
      <div style="border:1px solid #eee; border-radius:12px; padding:20px; margin:16px 0; text-align:center; background:#fafafa;">
        <p style="margin:0 0 8px; color:#666; font-size:13px;">Ticket ${ticketIndex} of ${quantity}</p>
        <h3 style="margin:0 0 12px; color:#0a0a0a;">${ticketType}</h3>
        <img src="${qrUrl}" alt="QR Code" width="280" height="280" style="display:block; margin:0 auto; max-width:280px;" />
        <p style="margin:12px 0 0; font-size:12px; color:#888;">Show this QR at the gate</p>
      </div>`;
  }).join("");

  const emailHtml = `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0a0a0a;">
      <h1 style="color:#f5a623; margin:0 0 4px;">Otown Party 15.0</h1>
      <p style="margin:0 0 24px; color:#666;">Afro All Black Edition — Sat 17th October 2026 · 6PM–4AM · Oyo Durbar Stadium, Oyo State</p>
      <p>Hi ${cleanName.replace(/[<>]/g, "")},</p>
      <p>Your payment has been confirmed. Below ${quantity > 1 ? `are your ${quantity} tickets` : "is your ticket"}. Each QR code is unique — present it at the gate for scanning.</p>
      ${ticketHtml}
      <p style="margin-top:24px; font-size:13px; color:#666;">
        Total paid: ₦${(intent.total_amount / 100).toLocaleString()}<br/>
        Payment reference: ${reference}
      </p>
      <p style="margin-top:24px; font-size:12px; color:#999;">If you didn't make this purchase, reply to this email immediately.</p>
    </div>`;

  const attachments = await Promise.all(qrPayloads.map(({ payload, ticketIndex }) =>
    qrAttachment(payload, `otown-party-ticket-${ticketIndex}.png`)
  ));

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromAddress,
      to: [cleanEmail],
      subject: `Your Otown Party 15.0 Ticket${quantity > 1 ? "s" : ""} 🎉`,
      html: emailHtml,
      attachments,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend error for", cleanEmail, resendRes.status, errText);
    return { emailSent: false, emailError: `Resend ${resendRes.status}: ${errText}` };
  }
  console.log("Resend OK for:", cleanEmail);

  const { error: claimErr } = await supabase.from("payment_intents").update({
    status: "claimed",
    buyer_name: cleanName,
    buyer_email: cleanEmail,
    claimed_at: intent.claimed_at || new Date().toISOString(),
  }).eq("reference", reference);
  if (claimErr) throw claimErr;
  return { emailSent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const signingSecret = Deno.env.get("QR_SIGNING_SECRET");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!signingSecret || !resendKey || !paystackSecret) {
      throw new Error("Missing required secrets (QR_SIGNING_SECRET / RESEND_API_KEY / PAYSTACK_SECRET_KEY)");
    }
    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rawBody = await req.text();
    const paystackSig = req.headers.get("x-paystack-signature");

    let reference = "";
    let overrideName = "";
    let overrideEmail = "";
    let metadataName = "";
    let customerEmail = "";

    if (paystackSig) {
      // Webhook path — verify signature
      const expected = await hmacSha512Hex(paystackSecret, rawBody);
      if (!timingSafeEqual(expected, paystackSig)) {
        console.error("Invalid Paystack signature");
        return new Response("Invalid signature", { status: 401 });
      }
      const event = JSON.parse(rawBody);
      console.log("Paystack webhook event:", event?.event, "reference:", event?.data?.reference);

      if (event?.event !== "charge.success") {
        return new Response(JSON.stringify({ ok: true, ignored: event?.event }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      reference = event?.data?.reference || "";
      metadataName = event?.data?.metadata?.buyer_name || "";
      customerEmail = event?.data?.customer?.email || "";
    } else {
      // Manual admin / fallback path — must include reference, name+email optional
      const body = rawBody ? JSON.parse(rawBody) : {};
      reference = body?.reference || "";
      overrideName = body?.name || "";
      overrideEmail = body?.email || "";
    }

    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle VENDOR-* references: mark vendor paid + trigger QR email
    if (reference.startsWith("VENDOR-")) {
      // Verify with Paystack first
      const psRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      const psData = await psRes.json();
      if (!psRes.ok || psData?.data?.status !== "success") {
        return new Response(JSON.stringify({
          error: "vendor payment not successful on Paystack",
          paystackStatus: psData?.data?.status,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: vendor, error: vErr } = await supabase
        .from("vendor_applications").select("*").eq("reference", reference).maybeSingle();
      if (vErr) throw vErr;
      if (!vendor) {
        return new Response(JSON.stringify({ error: "vendor not found", reference }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (vendor.status !== "paid") {
        await supabase.from("vendor_applications")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("reference", reference);
      }

      // Fire QR email via existing function (idempotent-ish; safe to re-invoke)
      const qrRes = await supabase.functions.invoke("send-vendor-qr", {
        body: { reference },
      });
      if (qrRes.error) console.error("send-vendor-qr invoke failed:", qrRes.error);

      return new Response(JSON.stringify({
        ok: true, vendor: true, reference, emailInvoked: !qrRes.error,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only OTP-* references belong to ticket sales beyond this point
    if (!reference.startsWith("OTP-")) {
      return new Response(JSON.stringify({ ok: true, skipped: "non-ticket reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intent, error: intentErr } = await supabase
      .from("payment_intents").select("*").eq("reference", reference).maybeSingle();
    if (intentErr) throw intentErr;
    if (!intent) {
      return new Response(JSON.stringify({ error: "payment intent not found", reference }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } }
    );
    const psData = await psRes.json();
    if (!psRes.ok || !psData?.status || psData?.data?.status !== "success") {
      return new Response(JSON.stringify({
        error: "payment not successful on Paystack",
        paystackStatus: psData?.data?.status,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull fallbacks from Paystack response
    if (!metadataName) metadataName = psData?.data?.metadata?.buyer_name || "";
    if (!customerEmail) customerEmail = psData?.data?.customer?.email || "";

    // Resolve final buyer name + email — priority: explicit override → intent → Paystack metadata/customer
    const finalName = (overrideName || intent.buyer_name || metadataName || "").trim();
    const finalEmail = (overrideEmail || intent.buyer_email || customerEmail || "").trim().toLowerCase();

    if (finalName.length < 2 || !emailRegex(finalEmail)) {
      // Mark verified so the buyer's browser claim flow can still complete
      if (intent.status !== "verified") {
        await supabase.from("payment_intents")
          .update({ status: "verified", verified_at: new Date().toISOString() })
          .eq("reference", reference);
      }
      return new Response(JSON.stringify({
        error: "missing buyer name/email — cannot auto-issue, waiting for browser claim",
        reference,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark verified before issuing
    if (intent.status === "pending") {
      await supabase.from("payment_intents")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("reference", reference);
      intent.status = "verified";
    }

    const result = await issueTicketsAndEmail({
      supabase, intent, name: finalName, email: finalEmail,
      signingSecret, resendKey, fromAddress,
    });

    return new Response(JSON.stringify({
      ok: true, issued: true, reference,
      emailSent: result.emailSent, emailError: result.emailError,
      to: finalEmail,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("paystack-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
