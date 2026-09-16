import { useState } from "react";
import { Check, Mail, MapPin, Loader2, Minus, Plus, Sparkles, Repeat, X, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const tickets = [
  { name: "Early Bird", badge: "Best Value", price: 4000, features: ["Full event access"], accent: "primary" as const, featured: true, soldOut: false },
  { name: "Regular", price: 5000, features: ["Full event access"], accent: "foreground" as const, featured: false, soldOut: false },
  { name: "VIP Experience", price: 15000, features: ["Full stage access", "Premium visibility", "Priority entry", "Access to merch"], accent: "pink" as const, featured: false, soldOut: false },
];

// Set this to true to close online sales and show venue-only message
const ONLINE_SALES_CLOSED = false;

const loadPaystackScript = () => new Promise<void>((resolve, reject) => {
  if (window.PaystackPop) return resolve();
  const s = document.createElement("script");
  s.src = "https://js.paystack.co/v1/inline.js";
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Failed to load Paystack"));
  document.head.appendChild(s);
});

const Tickets = () => {
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{ name: string; quantity: number; price: number } | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [attendeeType, setAttendeeType] = useState<"first-timer" | "returning" | "">("");

  const getQty = (name: string) => quantities[name] ?? 1;
  const setQty = (name: string, qty: number) =>
    setQuantities((q) => ({ ...q, [name]: Math.max(1, Math.min(10, qty)) }));

  const openDetails = (ticketName: string, price: number) => {
    if (ONLINE_SALES_CLOSED) return;
    setActiveTicket({ name: ticketName, quantity: getQty(ticketName), price });
    setDetailsOpen(true);
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    if (buyerName.trim().length < 2) return toast.error("Please enter your full name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) return toast.error("Please enter a valid email");
    if (!attendeeType) return toast.error("Tell us — first-timer or returning raver?");

    const ticketName = activeTicket.name;
    const quantity = activeTicket.quantity;
    setLoading(ticketName);
    try {
      await loadPaystackScript();
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          ticketType: ticketName,
          quantity,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim(),
          attendeeType,
        },
      });
      if (error || !data?.reference) throw new Error(error?.message || "Failed to start payment");

      try {
        localStorage.setItem(
          `otp_buyer_${data.reference}`,
          JSON.stringify({
            name: buyerName.trim(),
            email: buyerEmail.trim(),
            phone: buyerPhone.trim(),
            attendeeType,
          })
        );
      } catch {}

      const handler = window.PaystackPop.setup({
        key: data.publicKey,
        email: buyerEmail.trim(),
        amount: data.amount,
        currency: "NGN",
        ref: data.reference,
        metadata: {
          ticketType: ticketName,
          quantity,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim(),
          attendee_type: attendeeType,
        },
        channels: ["bank_transfer", "card", "ussd", "mobile_money", "qr", "bank"],
        onClose: () => setLoading(null),
        callback: (response: any) => {
          const ref = response.reference;
          const finalName = buyerName.trim();
          const finalEmail = buyerEmail.trim();
          const goSuccess = () => {
            try { localStorage.removeItem(`otp_buyer_${ref}`); } catch {}
            navigate(
              `/success?fullname=${encodeURIComponent(finalName)}&email=${encodeURIComponent(finalEmail)}`
            );
          };
          supabase.functions
            .invoke("claim-tickets", { body: { reference: ref, name: finalName, email: finalEmail } })
            .then(({ data, error }) => {
              if (error || (!data?.success && !data?.alreadyClaimed)) {
                toast.error(
                  "Payment received. If your email doesn't arrive in a few minutes, contact pr@otownparty.com with ref: " + ref
                );
              } else if (data?.success && data?.emailSent === false) {
                toast.error("Tickets saved but email failed. Contact pr@otownparty.com with ref: " + ref);
              }
            })
            .catch(() => {
              toast.error("Payment received. If your email doesn't arrive shortly, contact pr@otownparty.com with ref: " + ref);
            });
          goSuccess();
        },
      });
      setDetailsOpen(false);
      handler.openIframe();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Could not start payment");
      setLoading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSent(true); };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Tickets & Contact</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">Otown Party 15.0 · Afro All Black Edition</h1>
            <p className="text-muted-foreground max-w-2xl mb-8">Sat 17th October 2026 · 6PM–4AM · Oyo Durbar Stadium, Oyo State. Secure your place — tickets are limited.</p>
          </ScrollReveal>

          {/* Venue sales banner */}
          {ONLINE_SALES_CLOSED && (
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-pink-400/10 to-sky-400/5 p-6 sm:p-8 mb-10">
                {/* Animated glow orbs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-pink-400/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center gap-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/40 border border-primary/30 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <p className="text-primary text-[10px] font-bold uppercase tracking-[0.25em]">
                      Tonight We Rave
                    </p>
                  </div>

                  <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight">
                    Come prepared to rave all black in Oyo<span className="text-primary">.</span>
                  </h2>

                  <p className="max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Online sales are locked — the rave is too close! Tickets are now sold at the venue only. Pull up early, grab your wristband, and step into the madness.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-primary/90 text-sm font-semibold tracking-wide">
                    <span className="flex items-center gap-2">
                      <Sparkles size={16} className="animate-pulse" />
                      <span>Oyo Durbar Stadium, Oyo State</span>
                    </span>
                    <span className="hidden sm:inline text-border">|</span>
                    <span className="flex items-center gap-2">
                      <span>Gates open 6PM · Show runs till 4AM</span>
                      <Sparkles size={16} className="animate-pulse" />
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground/80 max-w-md">
                    Come with your QR code if you already bought online. No QR? No problem — buy at the gate and get scanned in.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          )}

          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            <div className="space-y-6">
              {tickets.map((t) => {
                const qty = getQty(t.name);
                const total = t.price * qty;
                const isLoading = loading === t.name;
                const isDisabled = ONLINE_SALES_CLOSED || (t.soldOut ?? false);

                return (
                  <ScrollReveal key={t.name}>
                    <div className={`bg-card border rounded-xl p-6 transition-all ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-1"} ${
                      t.featured ? "border-primary border-l-4" : t.accent === "pink" ? "border-pink-400/40" : "border-border"
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-display font-bold text-lg text-foreground">{t.name}</h3>
                        {t.badge && (
                          <span className="bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            {t.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-display font-bold mb-4 text-foreground">
                        ₦{t.price.toLocaleString()}
                        <span className="text-sm text-muted-foreground font-normal"> / ticket</span>
                      </p>

                      <ul className="space-y-2 mb-5">
                        {t.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check size={14} className="flex-shrink-0 text-primary" /> {f}
                          </li>
                        ))}
                      </ul>

                      {!isDisabled && (
                        <div className="flex items-center justify-between mb-4 bg-muted/40 rounded-lg p-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</span>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setQty(t.name, qty - 1)} className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:border-primary"><Minus size={14} /></button>
                            <span className="font-semibold text-foreground w-6 text-center">{qty}</span>
                            <button type="button" onClick={() => setQty(t.name, qty + 1)} className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:border-primary"><Plus size={14} /></button>
                          </div>
                        </div>
                      )}

                      <button
                        disabled={isDisabled || isLoading}
                        onClick={() => openDetails(t.name, t.price)}
                        className={`block w-full py-3 rounded-lg font-semibold text-sm text-center transition ${
                          isDisabled
                            ? "bg-muted border border-border text-muted-foreground cursor-not-allowed"
                            : t.featured
                              ? "bg-primary text-primary-foreground hover:brightness-110"
                              : "bg-foreground/90 text-background hover:brightness-110"
                        }`}
                      >
                        {isLoading ? <Loader2 className="animate-spin inline" size={16} /> : isDisabled ? "Available at the Venue" : `Buy ${qty} for ₦${total.toLocaleString()}`}
                      </button>
                    </div>
                  </ScrollReveal>
                );
              })}

              <ScrollReveal>
                <Link
                  to="/vendor"
                  className="block bg-card border border-sky/40 border-l-4 border-l-sky rounded-xl p-6 transition-all hover:-translate-y-1 hover:border-sky group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-display font-bold text-lg text-foreground">Apply as a Vendor</h3>
                    <span className="bg-sky/10 text-sky text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Brands
                    </span>
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground mb-4">From ₦40,000</p>
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-sky flex-shrink-0" /> Showcase your brand to thousands
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-sky flex-shrink-0" /> Dedicated vendor space
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-sky flex-shrink-0" /> Direct access to our community
                    </li>
                  </ul>
                  <div className="block w-full py-3 rounded-lg border border-sky text-sky font-semibold text-sm text-center transition group-hover:bg-sky/10">
                    Apply as a Vendor →
                  </div>
                </Link>
              </ScrollReveal>
            </div>

            <ScrollReveal>
              <div className="bg-card border border-border rounded-xl p-8">
                <h2 className="font-display font-bold text-xl text-foreground mb-6">Get In Touch</h2>
                {sent ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="text-primary" size={32} />
                    </div>
                    <h3 className="font-display font-bold text-lg text-foreground">Message Sent!</h3>
                    <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                      <input type="text" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                      <input type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
                      <textarea required maxLength={1000} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Your message..." />
                    </div>
                    <button type="submit" className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition">Send Message</button>
                  </form>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-6 mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail size={16} className="text-primary" />
                  <a href="mailto:pr@otownparty.com" className="hover:text-primary transition">pr@otownparty.com</a>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin size={16} className="text-primary" /> Africa – Location Announced Per Edition
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>

      {/* Personal Details Modal — only shown when ONLINE_SALES_CLOSED is false */}
      {!ONLINE_SALES_CLOSED && (
        <Dialog open={detailsOpen} onOpenChange={(o) => { if (!loading) setDetailsOpen(o); }}>
          <DialogContent className="bg-card border border-border max-w-md p-0 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/20 via-pink-400/10 to-transparent pointer-events-none" />
              <div className="relative p-6 sm:p-7">
                <DialogHeader className="space-y-2 mb-5">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.25em]">Step 1 of 2 — Your Details</p>
                  <DialogTitle className="font-display font-bold text-2xl text-foreground leading-tight">
                    Lock in your spot{activeTicket ? `, ${activeTicket.quantity}× ${activeTicket.name}` : ""}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    We'll send your QR code{activeTicket && activeTicket.quantity > 1 ? "s" : ""} to the email below right after payment.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                    <input type="text" required maxLength={100} value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                      disabled={!!loading}
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="As you'd like it on the ticket" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                    <input type="email" required maxLength={255} value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                      disabled={!!loading}
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="where to send your QR" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Phone <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></label>
                    <input type="tel" maxLength={20} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                      disabled={!!loading}
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+234…" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Is this your first Otown?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setAttendeeType("first-timer")} disabled={!!loading}
                        className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-semibold transition text-left ${
                          attendeeType === "first-timer"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-foreground hover:border-primary/60"
                        }`}>
                        <Sparkles size={16} className="shrink-0" />
                        <span>First-timer</span>
                      </button>
                      <button type="button" onClick={() => setAttendeeType("returning")} disabled={!!loading}
                        className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-semibold transition text-left ${
                          attendeeType === "returning"
                            ? "border-pink-400 bg-pink-400/10 text-pink-400"
                            : "border-border bg-muted text-foreground hover:border-pink-400/60"
                        }`}>
                        <Repeat size={16} className="shrink-0" />
                        <span>Returning raver</span>
                      </button>
                    </div>
                  </div>
                  {activeTicket && (
                    <div className="flex items-center justify-between pt-2 pb-1 px-1 text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-display font-bold text-foreground text-lg">
                        ₦{(activeTicket.price * activeTicket.quantity).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <button type="submit" disabled={!!loading}
                    className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition disabled:opacity-60">
                    {loading ? (
                      <span className="inline-flex items-center gap-2 justify-center"><Loader2 size={14} className="animate-spin" /> Opening payment…</span>
                    ) : "Proceed to Payment →"}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">Secure checkout powered by Paystack</p>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </>
  );
};

export default Tickets;
