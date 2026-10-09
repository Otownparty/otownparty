// Initialize a Paystack payment for vendor application.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VENDOR_OPTIONS: Record<string, { category: string; label: string; amount: number }> = {
  food: { category: "Consumable", label: "Food", amount: 60000_00 },
  healthy_meals_pastries: { category: "Consumable", label: "Healthy Meals / Pastries", amount: 50000_00 },
  shawarma_chicken_grills: { category: "Consumable", label: "Shawarma / Chicken & Chips / Grills", amount: 50000_00 },
  ice_cream: { category: "Consumable", label: "Ice Cream", amount: 50000_00 },
  popcorn_parfait: { category: "Consumable", label: "Popcorn and Parfait", amount: 50000_00 },
  pepper_soup: { category: "Consumable", label: "Pepper Soup", amount: 40000_00 },
  suya: { category: "Consumable", label: "Suya", amount: 30000_00 },
  asun: { category: "Consumable", label: "Asun", amount: 30000_00 },
  snail_peppered_chicken: { category: "Consumable", label: "Snail", amount: 40000_00 },
  coffee: { category: "Consumable", label: "Coffee", amount: 40000_00 },
  shisha: { category: "Consumable", label: "Shisha", amount: 50000_00 },
  jewelry_accessories: { category: "Non-Consumable", label: "Jewelry / Accessories", amount: 30000_00 },
  perfumes_fragrances: { category: "Non-Consumable", label: "Perfumes / Fragrances", amount: 30000_00 },
  clothes_streetwear: { category: "Non-Consumable", label: "Clothes / Streetwear / Vintage Gear", amount: 40000_00 },
  other_non_consumable: { category: "Non-Consumable", label: "Other", amount: 40000_00 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      brandName, brandDescription, instagram, city, phone, email,
      previousVendor, businessCategory, subCategoryKey, otherDescription,
    } = body ?? {};

    const selectedOption = typeof subCategoryKey === "string" ? VENDOR_OPTIONS[subCategoryKey] : null;
    if (!selectedOption || selectedOption.category !== businessCategory) {
      return new Response(JSON.stringify({ error: "Invalid vendor category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!brandName || !email || !phone || !instagram || !brandDescription || !previousVendor) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = selectedOption.amount;
    const subCategoryLabel = selectedOption.label === "Other" && otherDescription
      ? `Other — ${String(otherDescription).trim()}`
      : selectedOption.label;
    const reference = `VENDOR-${crypto.randomUUID()}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("vendor_applications").insert({
      reference,
      brand_name: String(brandName).trim(),
      brand_description: String(brandDescription).trim(),
      instagram: String(instagram).trim(),
      city: city ? String(city).trim() : null,
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      previous_vendor: String(previousVendor),
      business_category: String(businessCategory),
      sub_category: subCategoryLabel,
      sub_category_key: String(subCategoryKey),
      amount,
      status: "pending",
    });
    if (error) throw error;

    const publicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY");
    if (!publicKey) throw new Error("PAYSTACK_PUBLIC_KEY not configured");

    return new Response(JSON.stringify({ reference, amount, publicKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("initialize-vendor-payment error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
