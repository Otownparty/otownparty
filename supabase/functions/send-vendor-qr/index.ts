// Send a signed QR code to a vendor after successful payment.
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

async function qrAttachment(payload: string) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(payload)}`;
  const response = await fetch(qrUrl);
  if (!response.ok) throw new Error(`QR image generation failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { filename: "otown-party-vendor-pass.png", content: btoa(binary) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "Reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signingSecret = Deno.env.get("QR_SIGNING_SECRET");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!signingSecret) throw new Error("QR_SIGNING_SECRET not configured");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: vendor, error: fetchErr } = await supabase
      .from("vendor_applications").select("*").eq("reference", reference).single();
    if (fetchErr || !vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (vendor.status !== "paid") {
      return new Response(JSON.stringify({ error: "Vendor not paid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const edition = vendor.edition || "Otown Party 15.0 - Afro All Black Edition";
    const payloadObj = {
      vid: vendor.id,
      n: vendor.brand_name,
      e: vendor.email,
      cat: vendor.business_category,
      sub: vendor.sub_category,
      a: vendor.amount,
      ed: edition,
      r: vendor.reference,
      type: "vendor",
    };
    const payloadJson = JSON.stringify(payloadObj);
    const sig = await hmacSign(signingSecret, payloadJson);
    const fullPayload = JSON.stringify({ ...payloadObj, sig });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(fullPayload)}`;
    const attachment = await qrAttachment(fullPayload);

    const emailHtml = `
      <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0a0a0a;">
        <h1 style="color:#f5a623; margin:0 0 4px;">Otown Party 15.0</h1>
        <p style="margin:0 0 24px; color:#666;">Afro All Black Edition — Sat 17th October 2026 · 6PM–4AM · Oyo Durbar Stadium, Oyo State</p>
        <p>Hi ${String(vendor.brand_name).replace(/[<>]/g, "")},</p>
        <p>Your vendor application and payment have been confirmed. Below is your unique vendor QR code — please present it at the ticket stand on event day for your access and setup.</p>
        <div style="border:1px solid #eee; border-radius:12px; padding:20px; margin:16px 0; text-align:center; background:#fafafa;">
          <p style="margin:0 0 8px; color:#666; font-size:13px;">Vendor Pass</p>
          <h3 style="margin:0 0 12px; color:#0a0a0a;">${String(vendor.sub_category || vendor.business_category).replace(/[<>]/g, "")}</h3>
          <img src="${qrUrl}" alt="QR Code" width="280" height="280" style="display:block; margin:0 auto; max-width:280px;" />
          <p style="margin:12px 0 0; font-size:12px; color:#888;">Show this QR at the ticket stand</p>
        </div>
        <p style="margin-top:24px; font-size:13px; color:#666;">
          Amount paid: ₦${(vendor.amount / 100).toLocaleString()}<br/>
          Reference: ${vendor.reference}
        </p>
        <p style="margin-top:16px; font-size:13px; color:#666;">
          Join our vendors WhatsApp forum to stay updated:
          <a href="https://chat.whatsapp.com/GtXPCiAK3nj0VwRv8KsjHp?mode=gi_t" style="color:#f5a623;">Join Vendors Forum</a>
        </p>
      </div>`;

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [vendor.email],
        subject: `Your Otown Party 15.0 Vendor Pass 🎉`,
        html: emailHtml,
        attachments: [attachment],
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        emailError: `Email delivery failed (${resendRes.status}): ${errText}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-vendor-qr error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
