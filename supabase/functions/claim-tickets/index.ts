// After payment verified, accept buyer name+email, create N tickets with signed QR codes,
// generate QR images and email them via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const enc = new TextEncoder();

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function emailRegex(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference, name, email, force } = await req.json();

    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "Reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
      return new Response(JSON.stringify({ error: "Valid name required (2-100 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || typeof email !== "string" || !emailRegex(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signingSecret = Deno.env.get("QR_SIGNING_SECRET");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!signingSecret) throw new Error("QR_SIGNING_SECRET not configured");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    if (!paystackSecret) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load intent
    const { data: intent, error: intentErr } = await supabase
      .from("payment_intents").select("*").eq("reference", reference).single();
    if (intentErr || !intent) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already fully claimed (usually the Paystack webhook already issued + emailed
    // the QR codes). Don't send a second copy of the same ticket email.
    if (intent.status === "claimed" && !force) {
      console.log("Already claimed, skipping duplicate email for:", reference);
      return new Response(JSON.stringify({
        success: true, emailSent: true, alreadyClaimed: true,
        reference, quantity: intent.quantity,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (intent.status === "pending") {
      console.log("Status is pending — verifying with Paystack:", reference);
      const psRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      const psData = await psRes.json();
      console.log("Paystack response status:", psData?.data?.status);

      if (!psRes.ok || !psData.status || psData.data?.status !== "success") {
        return new Response(JSON.stringify({
          error: "Payment not confirmed by Paystack. If you just paid, wait a moment and try again.",
          paystackStatus: psData?.data?.status,
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark verified so future calls skip this step
      await supabase.from("payment_intents")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("reference", reference);

      console.log("Payment verified, proceeding to issue tickets");
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const edition = intent.edition || "Otown Party 15.0 - Afro All Black Edition";
    const unitPrice = intent.unit_price;
    const ticketType = intent.ticket_type;
    const quantity = intent.quantity;

    const qrPayloads: { ticketId: string; payload: string; ticketIndex: number }[] = [];

    // Reuse previously issued tickets when retrying a failed/missing email.
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
        tid: ticketId,
        n: cleanName,
        e: cleanEmail,
        t: ticketType,
        a: unitPrice,
        q: quantity,
        i: i,
        ed: edition,
        r: reference,
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
      qrPayloads.push({ ticketId, payload: fullPayload, ticketIndex: i });
    }

    if (ticketRows.length) {
      const { error: insertErr } = await supabase.from("tickets").insert(ticketRows);
      if (insertErr) throw insertErr;
    }

    // Build email with QR codes
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

    const attachments = await Promise.all(qrPayloads.map(({ payload, ticketIndex }) =>
      qrAttachment(payload, `otown-party-ticket-${ticketIndex}.png`)
    ));

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

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";
    console.log("Sending email from:", fromAddress, "to:", cleanEmail);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
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
      console.error("Resend error:", resendRes.status, errText);
      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        emailError: `Email delivery failed (${resendRes.status}): ${errText}`,
        reference,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("Resend OK for:", cleanEmail);

    // Finalize only after the email provider accepted the QR email. This keeps
    // failed sends retryable without generating a second set of tickets.
    const { error: claimErr } = await supabase.from("payment_intents").update({
      status: "claimed",
      buyer_name: cleanName,
      buyer_email: cleanEmail,
      claimed_at: intent.claimed_at || new Date().toISOString(),
    }).eq("reference", reference);
    if (claimErr) throw claimErr;

    return new Response(JSON.stringify({
      success: true, emailSent: true, reference, quantity,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("claim-tickets error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
