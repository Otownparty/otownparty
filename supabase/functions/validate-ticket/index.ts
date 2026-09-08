// Called by the staff scanner. Validates QR signature, checks DB, and optionally marks ticket used.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has scanner/admin role
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scannerEmail = userData.user.email ?? "";
    const scannedByName = scannerEmail.endsWith("@staff.otownparty.com")
      ? scannerEmail.split("@")[0]
      : scannerEmail || userData.user.id;



    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roles } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id);
    const allowedRoles = ["admin", "scanner"];
    const hasAccess = (roles ?? []).some((r: any) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Not authorized to scan tickets" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { qrData, markUsed } = await req.json();
    if (!qrData || typeof qrData !== "string") {
      return new Response(JSON.stringify({ error: "qrData required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try { parsed = JSON.parse(qrData); } catch {
      return new Response(JSON.stringify({ valid: false, reason: "Not a valid Otown Party QR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { sig, ...payloadObj } = parsed;
    if (!sig) {
      return new Response(JSON.stringify({ valid: false, reason: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signingSecret = Deno.env.get("QR_SIGNING_SECRET")!;
    const expected = await hmacSign(signingSecret, JSON.stringify(payloadObj));
    if (expected !== sig) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid / forged signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VENDOR QR
    if (payloadObj.type === "vendor" && payloadObj.vid) {
      const { data: vendor } = await admin.from("vendor_applications")
        .select("*").eq("id", payloadObj.vid).single();
      if (!vendor) {
        return new Response(JSON.stringify({ valid: false, reason: "Vendor not found in database" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (vendor.status !== "paid") {
        return new Response(JSON.stringify({ valid: false, reason: "Vendor payment not confirmed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const alreadyScanned = !!vendor.scanned;
      let scannedJustNow = false;
      if (markUsed && !alreadyScanned) {
        const { error: updErr } = await admin.from("vendor_applications").update({
          scanned: true,
          scanned_at: new Date().toISOString(),
          scanned_by: scannedByName,
        }).eq("id", vendor.id).eq("scanned", false);
        if (!updErr) scannedJustNow = true;
      }
      return new Response(JSON.stringify({
        valid: true,
        kind: "vendor",
        alreadyUsed: alreadyScanned,
        usedJustNow: scannedJustNow,
        vendor: {
          id: vendor.id,
          brandName: vendor.brand_name,
          email: vendor.email,
          phone: vendor.phone,
          category: vendor.business_category,
          subCategory: vendor.sub_category,
          amountPaid: vendor.amount,
          reference: vendor.reference,
          scannedAt: vendor.scanned_at,
          scannedBy: vendor.scanned_by,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up the ticket
    const { data: ticket } = await admin.from("tickets")
      .select("*").eq("id", payloadObj.tid).single();
    if (!ticket) {
      return new Response(JSON.stringify({ valid: false, reason: "Ticket not found in database" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ticket.qr_signature !== sig) {
      return new Response(JSON.stringify({ valid: false, reason: "Signature mismatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alreadyUsed = ticket.used;
    let usedJustNow = false;

    if (markUsed && !alreadyUsed) {
      const { error: updErr } = await admin.from("tickets").update({
        used: true,
        used_at: new Date().toISOString(),
        used_by: scannedByName,
      }).eq("id", ticket.id).eq("used", false);
      if (!updErr) usedJustNow = true;
    }

    return new Response(JSON.stringify({
      valid: true,
      kind: "ticket",
      alreadyUsed,
      usedJustNow,
      ticket: {
        id: ticket.id,
        name: ticket.buyer_name,
        email: ticket.buyer_email,
        ticketType: ticket.ticket_type,
        amountPaid: ticket.amount_paid,
        ticketIndex: ticket.ticket_index,
        quantity: ticket.quantity,
        edition: ticket.edition,
        usedAt: ticket.used_at,
        usedBy: ticket.used_by,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("validate-ticket error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
