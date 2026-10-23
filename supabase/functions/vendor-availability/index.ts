import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getEvent } from "../_shared/event.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Vendor availability is not configured" }, 500);
    const db = createClient(url, key);
    const event = await getEvent(db);
    const counts: Record<string, number> = {};
    // Only anonymous aggregate totals leave this function; never vendor contact details.
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from("vendor_applications").select("sub_category_key")
        .eq("edition", event.edition).eq("status", "paid").range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? []) {
        if (row.sub_category_key) counts[row.sub_category_key] = (counts[row.sub_category_key] ?? 0) + 1;
      }
      if ((data?.length ?? 0) < 1000) break;
    }
    return json({ edition: event.edition, counts });
  } catch {
    return json({ error: "Could not load vendor availability. Please try again." }, 500);
  }
});