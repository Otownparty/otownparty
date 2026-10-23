import { useSearchParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEventEdition } from "@/hooks/useEventEdition";

const VendorSuccess = () => {
  const { event } = useEventEdition();
  const [params] = useSearchParams();
  const name = params.get("name") || "Vendor";
  const email = params.get("email") || "";
  const category = params.get("category") || "";

  useEffect(() => {
    const duration = 6000;
    const colors = ["#f5a623", "#e8728a", "#7fb8e8", "#ffffff", "#ffd700"];
    const end = Date.now() + duration;

    const runConfetti = () => {
      const confetti = (window as any).confetti;
      if (!confetti) return;
      const frame = () => {
        if (Date.now() > end) return;
        confetti({ particleCount: 6, angle: 60, spread: 80, origin: { x: 0, y: 0.2 }, colors, zIndex: 9999 });
        confetti({ particleCount: 6, angle: 120, spread: 80, origin: { x: 1, y: 0.2 }, colors, zIndex: 9999 });
        requestAnimationFrame(frame);
      };
      confetti({ particleCount: 100, spread: 160, origin: { x: 0.5, y: 0.3 }, colors, zIndex: 9999 });
      frame();
    };

    const existing = document.getElementById("confetti-script");
    if (existing) { runConfetti(); return; }
    const script = document.createElement("script");
    script.id = "confetti-script";
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
    script.onload = runConfetti;
    document.head.appendChild(script);
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="relative bg-card border border-primary/30 rounded-2xl max-w-lg w-full p-8 sm:p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
              <Check className="text-primary" size={28} />
            </div>

            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">
              Registration Confirmed
            </p>
            <p className="text-sm text-primary mb-4">{params.get("edition")?.replace(" - ", " · ") || `Otown Party ${event.num}.0 · ${event.title}`}</p>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4 leading-tight">
              Welcome to the movement,{" "}
              <span className="text-primary">{name}</span>! 🎉
            </h1>

            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Your <span className="text-foreground font-semibold">{category}</span> vendor registration has been received and payment confirmed. Your application is now under review.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-4 text-left">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">QR Code Sent</p>
              <p className="text-sm text-foreground/90">
                Your unique vendor QR code has been sent to{email ? <> <span className="text-primary font-semibold">{email}</span></> : " your email"}. Please present it at the ticket stand on event day for your access.
              </p>
            </div>

            {email && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6">
                <p className="text-xs text-muted-foreground mb-1">Confirmation details sent to</p>
                <p className="text-primary font-semibold text-sm">{email}</p>
              </div>
            )}

            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              Join our exclusive vendors forum on WhatsApp to stay updated on event logistics, setup details, and any announcements from the Otown Party team.
            </p>

            <a
              href="https://chat.whatsapp.com/GtXPCiAK3nj0VwRv8KsjHp?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-lg bg-green-500 text-white font-display font-bold text-sm hover:bg-green-600 transition mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004c-1.107 0-2.178-.288-3.117-.832l-.223-.133-2.307.605.616-2.248-.145-.232c-.552-.882-.846-1.9-.846-2.95 0-3.152 2.564-5.71 5.714-5.71 1.526 0 2.96.596 4.04 1.677 1.08 1.082 1.673 2.519 1.671 4.036 0 3.152-2.564 5.71-5.713 5.71M19.07 4.993C17.147 3.071 14.435 2 11.495 2 5.508 2 .758 6.746.754 12.73c0 1.99.52 3.932 1.507 5.643L0 24l5.91-1.55a10.216 10.216 0 005.578 1.642h.005c5.984 0 10.734-4.746 10.737-10.73 0-2.869-1.117-5.568-3.151-7.603"/>
              </svg>
              Join Vendors Forum
            </a>

            <Link
              to="/"
              className="inline-block w-full py-3 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VendorSuccess;
