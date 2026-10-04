// Email the other person in a Find A Raver match when a new message arrives.
// Uses the same sender as the OTP sign-in codes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.message_id ?? "");
    const origin = String(body?.origin ?? "https://otownparty.com").slice(0, 200);
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) return json({ error: "Invalid message id" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: msg } = await admin.from("partner_messages").select("*").eq("id", messageId).maybeSingle();
    if (!msg || msg.sender_id !== user.id) return json({ error: "Not your message" }, 403);
    const { data: match } = await admin.from("partner_matches").select("*").eq("id", msg.match_id).maybeSingle();
    if (!match) return json({ error: "Match not found" }, 404);

    const recipientId = match.user_a === user.id ? match.user_b : match.user_a;
    const { data: recipient } = await admin.auth.admin.getUserById(recipientId);
    const to = recipient?.user?.email;
    if (!to) return json({ success: true, skipped: "no email" });

    const { data: senderProfile } = await admin.from("partner_profiles")
      .select("display_name").eq("user_id", user.id).maybeSingle();
    const name = esc(senderProfile?.display_name ?? "A raver");

    const { count } = await admin.from("partner_messages")
      .select("id", { count: "exact", head: true }).eq("match_id", match.id).eq("sender_id", recipientId);
    const awaitingReply = (count ?? 0) === 0;
    const preview = esc(String(msg.content).slice(0, 140));
    const link = `${origin.replace(/\/$/, "")}/partner`;

    const note = awaitingReply
      ? `<p style="background:#fff7e6;border:1px solid #f5a623;border-radius:10px;padding:12px;font-size:14px;">⏳ Once you reply, you two have <b>24 hours</b> to chat. Make it count!</p>`
      : match.chat_expires_at
        ? `<p style="font-size:13px;color:#666;">Your chat ends ${new Date(match.chat_expires_at).toUTCString()}.</p>`
        : "";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0a0a;">
        <h1 style="color:#f5a623;margin:0 0 4px;">Otown Party</h1>
        <p style="margin:0 0 24px;color:#666;">Find A Raver 👥</p>
        <p style="font-size:16px;"><b>${name}</b> sent you a message:</p>
        <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:12px 0;background:#fafafa;font-size:15px;">"${preview}"</div>
        ${note}
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#f5a623;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reply now</a>
        </p>
      </div>`;

    const ticketFrom = Deno.env.get("RESEND_FROM_EMAIL") || "Otown Party <onboarding@resend.dev>";
    const m = ticketFrom.match(/(?:<)?[^<>@\s]+@([^<>\s]+?)(?:>)?\s*$/);
    const from = Deno.env.get("OTP_FROM_EMAIL") || (m ? `Find A Raver <raver@${m[1]}>` : "Find A Raver <onboarding@resend.dev>");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `💬 ${senderProfile?.display_name ?? "A raver"} replied on Find A Raver`, html }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Resend error:", res.status, t);
      return json({ error: "Email failed", status: res.status, details: t }, 502);
    }
    return json({ success: true });
  } catch (err) {
    console.error("notify-partner-message error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
