// Verify a Find A Raver sign-in code, lock the device to that email, and
// return a magic-link token_hash the client exchanges for a real session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim();
    const deviceId = String(body?.device_id ?? "").trim();
    if (!email || email.length > 255 || !/^\d{6}$/.test(code)) {
      return json({ error: "Email and a 6-digit code are required" }, 400);
    }
    if (!deviceId || deviceId.length > 100) {
      return json({ error: "Missing device id" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Re-check the device lock here too (not just in send-partner-otp) so a
    // stale/replayed request can't slip a second account onto one device.
    const { data: lock } = await supabase
      .from("partner_device_locks")
      .select("email")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (lock && lock.email !== email) {
      return json(
        { error: "This device already has a Find A Raver account. Each device can only be linked to one account." },
        403
      );
    }

    const { data: row, error: fetchErr } = await supabase
      .from("partner_otp_codes").select("*")
      .eq("email", email).order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!row || row.code !== code) {
      return json({ error: "That code is incorrect. Check your email and try again." }, 400);
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return json({ error: "That code has expired. Request a new one." }, 400);
    }

    await supabase.from("partner_otp_codes").delete().eq("id", row.id);

    let { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink", email,
    });
    if (linkErr) {
      // User doesn't exist yet — create them (email verified by our code), then retry.
      const { error: createErr } = await supabase.auth.admin.createUser({
        email, email_confirm: true,
      });
      if (createErr) throw createErr;
      ({ data: link, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink", email,
      }));
      if (linkErr) throw linkErr;
    }

    let token_hash = link?.properties?.hashed_token ?? null;
    if (!token_hash && link?.properties?.action_link) {
      token_hash = new URL(link.properties.action_link).searchParams.get("token");
    }
    if (!token_hash) throw new Error("Could not generate sign-in token");

    // Lock the device to this email now that sign-in has succeeded. Upsert
    // is safe: same device + same email just refreshes created_at.
    await supabase.from("partner_device_locks").upsert(
      { device_id: deviceId, email, user_id: link?.user?.id ?? null },
      { onConflict: "device_id" }
    );

    return json({ token_hash });
  } catch (err) {
    console.error("verify-partner-otp error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
