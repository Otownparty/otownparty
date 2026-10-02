// Send a 6-digit sign-in code for the Find a Partner feature via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const deviceId = String(body?.device_id ?? "").trim();
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }
    if (!deviceId || deviceId.length > 100) {
      return json({ error: "Missing device id" }, 400);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // One account per device: if this device is already linked to a
    // different email, block before even sending a code.
    const { data: lock } = await supabase
      .from("partner_device_locks")
      .select("email")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (lock && lock.email !== email) {
      return json(
        { error: "This device already has a Find a Partner account. Each device can only be linked to one account." },
        403
      );
    }

    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const code = String(buf[0] % 1_000_000).padStart(6, "0");

    const { error: delErr } = await supabase
      .from("partner_otp_codes").delete()
      .eq("email", email).gt("expires_at", new Date().toISOString());
    if (delErr) throw delErr;

    const { error: insErr } = await supabase.from("partner_otp_codes").insert({
      email, code, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (insErr) throw insErr;

    const emailHtml = `
      <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0a0a0a;">
        <h1 style="color:#f5a623; margin:0 0 4px;">Otown Party</h1>
        <p style="margin:0 0 24px; color:#666;">Find a Partner</p>
        <p>Here's your sign-in code:</p>
        <div style="border:1px solid #eee; border-radius:12px; padding:24px; margin:16px 0; text-align:center; background:#fafafa;">
          <p style="margin:0; font-size:40px; letter-spacing:10px; font-weight:bold; color:#0a0a0a;">${code}</p>
        </div>
        <p style="font-size:13px; color:#666;">This code expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
      </div>`;

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress, to: [email],
        subject: "Your Otown Party sign-in code", html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return json({ error: "Couldn't send the code. Please try again." }, 502);
    }

    return json({ success: true });
  } catch (err) {
    console.error("send-partner-otp error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
