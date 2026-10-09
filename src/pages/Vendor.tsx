import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { nextEdition } from "@/data/editions";

// PaystackPop is declared globally in src/types/paystack.d.ts

const loadPaystackScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });

type CategoryOption = {
  label: string;
  price: number;
  spots: number | null; // null = unlimited
  key: string;
};

const CONSUMABLE_OPTIONS: CategoryOption[] = [
  { key: "food", label: "Food", price: 60000, spots: 3 },
  { key: "healthy_meals_pastries", label: "Healthy Meals / Pastries", price: 50000, spots: 1 },
  { key: "shawarma_chicken_grills", label: "Shawarma / Chicken & Chips / Grills", price: 50000, spots: 1 },
  { key: "ice_cream", label: "Ice Cream", price: 50000, spots: 1 },
  { key: "popcorn_parfait", label: "Popcorn and Parfait", price: 50000, spots: 1 },
  { key: "pepper_soup", label: "Pepper Soup", price: 40000, spots: 1 },
  { key: "suya", label: "Suya", price: 30000, spots: 1 },
  { key: "asun", label: "Asun", price: 30000, spots: 1 },
  { key: "snail_peppered_chicken", label: "Snail", price: 40000, spots: 1 },
  { key: "coffee", label: "Coffee", price: 40000, spots: 1 },
  { key: "shisha", label: "Shisha", price: 50000, spots: 2 },
];

const NON_CONSUMABLE_OPTIONS: CategoryOption[] = [
  { key: "jewelry_accessories", label: "Jewelry / Accessories", price: 30000, spots: 1 },
  { key: "perfumes_fragrances", label: "Perfumes / Fragrances", price: 30000, spots: 1 },
  { key: "clothes_streetwear", label: "Clothes / Streetwear / Vintage Gear", price: 40000, spots: null },
  { key: "other_non_consumable", label: "Other", price: 40000, spots: null },
];

const Vendor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [spotCounts, setSpotCounts] = useState<Record<string, number>>({});
  const [spotsLoading, setSpotsLoading] = useState(true);

  const [form, setForm] = useState({
    brandName: "",
    brandDescription: "",
    instagram: "",
    city: "",
    phone: "",
    email: "",
    previousVendor: "",
    businessCategory: "",
    subCategoryKey: "",
    otherDescription: "",
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Fetch current spot counts from database
  useEffect(() => {
    const fetchSpots = async () => {
      setSpotsLoading(true);
      try {
        const { data, error } = await supabase
          .from("vendor_applications")
          .select("sub_category_key")
          .eq("status", "paid");

        if (error) throw error;

        const counts: Record<string, number> = {};
        data?.forEach((row) => {
          if (row.sub_category_key) {
            counts[row.sub_category_key] = (counts[row.sub_category_key] || 0) + 1;
          }
        });
        setSpotCounts(counts);
      } catch (err) {
        console.error("Failed to fetch spots:", err);
      } finally {
        setSpotsLoading(false);
      }
    };
    fetchSpots();
  }, []);

  const getSelectedOption = (): CategoryOption | null => {
    const all = [...CONSUMABLE_OPTIONS, ...NON_CONSUMABLE_OPTIONS];
    return all.find((o) => o.key === form.subCategoryKey) || null;
  };

  const getPrice = (): number => getSelectedOption()?.price || 0;

  const isSoldOut = (option: CategoryOption): boolean => {
    if (option.spots === null) return false;
    return (spotCounts[option.key] || 0) >= option.spots;
  };

  const getSpotLabel = (option: CategoryOption): string => {
    if (option.spots === null) return "";
    const taken = spotCounts[option.key] || 0;
    const remaining = option.spots - taken;
    return `${taken}/${option.spots} spots taken${remaining === 0 ? " — SOLD OUT" : ""}`;
  };

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.brandName.trim()) return toast.error("Brand name is required");
    if (!form.brandDescription.trim()) return toast.error("Brand description is required");
    if (!form.instagram.trim()) return toast.error("Instagram handle is required");
    if (!form.phone.trim()) return toast.error("Phone number is required");
    if (!form.email.trim()) return toast.error("Email address is required");
    if (!form.previousVendor) return toast.error("Please select vendor history");
    if (!form.businessCategory) return toast.error("Please select a business category");
    if (!form.subCategoryKey) return toast.error("Please select a product category");
    if (!agreed) return toast.error("Please agree to the terms and conditions");

    const selectedOption = getSelectedOption();
    if (!selectedOption) return toast.error("Invalid category selected");

    // Double check spot availability
    if (isSoldOut(selectedOption)) {
      return toast.error("Sorry, this category is sold out!");
    }

    const price = getPrice();
    if (!price) return toast.error("Invalid price");

    setLoading(true);

    try {
      await loadPaystackScript();

      const { data: initData, error: initErr } = await supabase.functions.invoke(
        "initialize-vendor-payment",
        {
          body: {
            brandName: form.brandName,
            brandDescription: form.brandDescription,
            instagram: form.instagram,
            city: form.city,
            phone: form.phone,
            email: form.email,
            previousVendor: form.previousVendor,
            businessCategory: form.businessCategory,
            subCategory: selectedOption.label,
            subCategoryKey: form.subCategoryKey,
            otherDescription: form.otherDescription,
          },
        }
      );

      if (initErr || !initData?.reference || !initData?.publicKey) {
        throw new Error(initErr?.message || initData?.error || "Could not load payment. Please try again.");
      }

      const handler = window.PaystackPop.setup({
        key: initData.publicKey,
        email: form.email.trim(),
        amount: initData.amount,
        currency: "NGN",
        ref: initData.reference,
        metadata: {
          brandName: form.brandName,
          businessCategory: form.businessCategory,
          subCategory: selectedOption.label,
        },
        channels: ["bank_transfer", "card", "ussd", "mobile_money", "qr", "bank"],
        onClose: () => {
          setLoading(false);
          toast.error("Payment cancelled");
        },
        callback: (response: any) => {
          supabase
            .from("vendor_applications")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("reference", response.reference)
            .then(({ error }) => {
              if (error) {
                console.error("Vendor payment update failed:", error);
                toast.error("Payment received, but confirmation failed. Please contact support.");
                setLoading(false);
                return;
              }

              // Fire-and-forget QR email; don't block navigation on failure
              supabase.functions.invoke("send-vendor-qr", {
                body: { reference: response.reference },
              }).catch((e) => console.error("send-vendor-qr failed:", e));

              navigate(
                `/vendor-success?name=${encodeURIComponent(form.brandName)}&email=${encodeURIComponent(form.email)}&category=${encodeURIComponent(selectedOption.label)}`
              );
            });
        },
      });

      handler.openIframe();

      // Paystack's payment window should appear almost instantly. If it
      // still hasn't shown up after 10s, something blocked it (weak
      // connection, VPN, firewall) — reset the button instead of leaving
      // it spinning forever with no way out.
      setTimeout(() => {
        const opened = document.querySelector('iframe[src*="paystack.co"]');
        if (!opened) {
          setLoading(false);
          toast.error("The payment window didn't open. Check your connection (try switching networks or turning off any VPN) and try again.");
        }
      }, 10000);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Could not start payment");
      setLoading(false);
    }
  };

  const renderCategoryOptions = (options: CategoryOption[]) => (
    <div className="space-y-2">
      {options.map((opt) => {
        const soldOut = isSoldOut(opt);
        const spotLabel = getSpotLabel(opt);
        const isSelected = form.subCategoryKey === opt.key;

        return (
          <label
            key={opt.key}
            className={`flex items-start gap-3 cursor-pointer group rounded-lg border p-3 transition ${
              soldOut
                ? "opacity-50 cursor-not-allowed border-border"
                : isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div
              onClick={() => {
                if (!soldOut) {
                  set("subCategoryKey", opt.key);
                }
              }}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition mt-0.5 shrink-0 ${
                isSelected
                  ? "border-primary bg-primary"
                  : soldOut
                  ? "border-muted"
                  : "border-border group-hover:border-primary/50"
              }`}
            >
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-sm font-medium ${soldOut ? "text-muted-foreground" : "text-foreground"}`}>
                  {opt.label}
                  {soldOut && (
                    <span className="ml-2 text-xs text-red-400 font-bold">SOLD OUT</span>
                  )}
                </span>
                <span className="text-primary font-bold text-sm shrink-0">
                  ₦{opt.price.toLocaleString()}
                </span>
              </div>
              {opt.spots !== null && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        soldOut ? "bg-red-400" : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(((spotCounts[opt.key] || 0) / opt.spots) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className={`text-xs shrink-0 ${soldOut ? "text-red-400" : "text-muted-foreground"}`}>
                    {spotsLoading ? "..." : spotLabel}
                  </span>
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-2xl px-4">

          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-3">
              Otown Party {nextEdition.num}.0 · {nextEdition.shortDate}
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-2">
              Vendor Registration
            </h1>
            <p className="text-muted-foreground text-sm">
              {nextEdition.venue} · {nextEdition.date}
            </p>
          </div>

          {/* Intro Card */}
          <div className="bg-card border border-primary/20 rounded-xl p-6 mb-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-3">
              Become an Otown Party Vendor
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The Otown Party movement is more than just the music and the energy — it's a full experience. Join our curated lineup of premium vendors and position your brand directly in front of an energetic, high-spending audience looking for top-tier food, drinks, fashion, and lifestyle products.
            </p>
            <div className="space-y-3">
              <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-2">Vendor Benefits</p>
              {[
                { num: "1", title: "Maximum Visibility", desc: "Showcase your business to an expansive, highly engaged crowd eager to explore new products, fashion, and services." },
                { num: "2", title: "Setup Provided", desc: "We provide a designated space including a tent, a table, a premium table cover, and two chairs." },
                { num: "3", title: "Team Access", desc: "Receive two (2) exclusive vendor tags for your team to ensure smooth entry and mobility throughout the event space." },
                { num: "4", title: "Dedicated Power & Lighting", desc: "A basic power source and lighting are provided to support your equipment (small appliances only)." },
              ].map((b) => (
                <div key={b.num} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {b.num}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-semibold">{b.title}: </span>
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Toggle */}
          <div className="bg-card border border-border rounded-xl mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="font-display font-bold text-sm text-foreground uppercase tracking-wide">
                Event Policies & Guidelines
              </span>
              {showRules ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-primary" />}
            </button>
            {showRules && (
              <div className="px-6 pb-6 space-y-3 border-t border-border pt-4">
                {[
                  { title: "Arrival & Setup", desc: "All vendors must arrive at the venue and complete their setup no later than 10:00 AM on the day of the event. Late arrivals will be subject to a penalty." },
                  { title: "Exclusive Beverage Policy", desc: "Vendors intending to sell water at the event must purchase it in bulk directly from the event organizers. Bringing in outside water to sell is strictly prohibited." },
                  { title: "Alcohol & External Drinks", desc: "Bringing in outside alcohol or other beverages for sale is completely restricted." },
                  { title: "Assigned Spaces", desc: "Vendors must remain at their allocated space throughout the event. Moving from the assigned location without authorization will result in immediate disqualification and blacklisting." },
                  { title: "Curated Selection", desc: "To maintain premium variety and prevent market saturation, vendor selection is based on product category. Applications are subject to review before final confirmation." },
                ].map((p) => (
                  <div key={p.title} className="flex gap-3">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-semibold">{p.title}: </span>
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleProceed} className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-5">
            <div>
              <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
                Vendor Registration Form
              </p>
              <p className="text-xs text-muted-foreground">
                For support: <a href="mailto:pr@otownparty.com" className="text-primary hover:underline">pr@otownparty.com</a>
              </p>
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Business / Brand Name <span className="text-primary">*</span>
              </label>
              <input type="text" required maxLength={100} value={form.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Your brand or business name" />
            </div>

            {/* Brand Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Brand Description <span className="text-primary">*</span>
              </label>
              <textarea required maxLength={500} rows={3} value={form.brandDescription}
                onChange={(e) => set("brandDescription", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Provide a short description of the products or services your brand offers" />
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Business Instagram Handle <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input type="text" required maxLength={60} value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value.replace("@", ""))}
                  className="w-full pl-8 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="yourbrand" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ensure your handle is exactly as it appears on Instagram — you'll be tagged in our vendor post.
              </p>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Business Location (City)</label>
              <input type="text" maxLength={60} value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Ibadan, Lagos, Oyo" />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone Number <span className="text-primary">*</span>
              </label>
              <input type="tel" required maxLength={20} value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Primary contact number" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address <span className="text-primary">*</span>
              </label>
              <input type="email" required maxLength={255} value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="your@email.com" />
            </div>

            {/* Previous Vendor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Have you been a previous vendor at an Otown Party? <span className="text-primary">*</span>
              </label>
              <div className="space-y-2">
                {["First time", "Returning Vendor"].map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                    <div onClick={() => set("previousVendor", opt)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                        form.previousVendor === opt ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                      }`}>
                      {form.previousVendor === opt && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Business Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Category <span className="text-primary">*</span>
              </label>
              <div className="space-y-2">
                {["Consumable", "Non-Consumable"].map((cat) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => {
                        set("businessCategory", cat);
                        set("subCategoryKey", "");
                      }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                        form.businessCategory === cat ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                      }`}>
                      {form.businessCategory === cat && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Consumable Sub-categories */}
            {form.businessCategory === "Consumable" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Your Product Category <span className="text-primary">*</span>
                </label>
                {renderCategoryOptions(CONSUMABLE_OPTIONS)}
              </div>
            )}

            {/* Non-Consumable Sub-categories */}
            {form.businessCategory === "Non-Consumable" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Your Product Category <span className="text-primary">*</span>
                </label>
                {renderCategoryOptions(NON_CONSUMABLE_OPTIONS)}
              </div>
            )}

            {/* Other description */}
            {(form.subCategoryKey === "other_non_consumable") && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Please describe your product/service <span className="text-primary">*</span>
                </label>
                <input type="text" value={form.otherDescription}
                  onChange={(e) => set("otherDescription", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Describe your product or service" />
              </div>
            )}

            {/* Price Summary */}
            {form.subCategoryKey && getPrice() > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground">Registration Fee</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{getSelectedOption()?.label}</p>
                </div>
                <span className="text-primary font-display font-bold text-lg">
                  ₦{getPrice().toLocaleString()}
                </span>
              </div>
            )}

            {/* Terms */}
            <div className="border-t border-border pt-5">
              <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-3">Terms & Conditions</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                I have read and agree to the rules and guidelines of the Otown Party vendor registration. I understand that my application will be reviewed and my slot is only confirmed upon approval.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => setAgreed(!agreed)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer mt-0.5 transition shrink-0 ${
                    agreed ? "border-primary bg-primary" : "border-border"
                  }`}>
                  {agreed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">I Agree to the terms and conditions</span>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !agreed}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm uppercase tracking-wider hover:brightness-110 transition disabled:opacity-50">
              {loading ? "Processing…" : `Proceed to Payment${getPrice() > 0 ? ` — ₦${getPrice().toLocaleString()}` : ""}`}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Vendor;
