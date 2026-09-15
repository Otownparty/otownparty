import { Check } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Success = () => {
  const [searchParams] = useSearchParams();
  const fullname = searchParams.get("fullname") || "Raver";
  const email = searchParams.get("email") || "";

  // Get first name only
  const firstName = fullname.split(" ")[0];

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="relative bg-card border border-primary/30 rounded-2xl max-w-lg w-full p-8 sm:p-12 text-center overflow-hidden">

          {/* Background glow */}
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Check icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
              <Check className="text-primary" size={28} />
            </div>

            {/* Subject line */}
            <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-4">
              You've got the Glow.
            </p>

            {/* Main heading — personalised */}
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-6 leading-tight">
              Hello {firstName},<br />Confirmation received.
            </h1>

            {/* Body */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              You've successfully joined the guest list for{" "}
              <span className="text-foreground font-semibold">Otown Party 15.0 · Afro All Black Edition.</span>
            </p>

            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Saturday, 17th October 2026 · 6PM–4AM · Oyo Durbar Stadium, Oyo State. Prepare for a night of raw energy, unmatched sound, and the culture at its loudest. We're setting the vibe to make this a core memory.
            </p>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Stay tuned for venue updates and style guides on our official site.
            </p>

            {/* Email confirmation */}
            {email && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-8">
                <p className="text-xs text-muted-foreground mb-1">Your ticket will be sent to</p>
                <p className="text-primary font-semibold text-sm">{email}</p>
              </div>
            )}

            {/* Divider + link */}
            <div className="border-t border-border pt-6 mb-8">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Explore the Culture
              </p>
              <a
                href="https://otownparty.com"
                className="text-primary font-semibold text-sm hover:underline"
              >
                otownparty.com
              </a>
            </div>

            {/* Return button */}
            <Link
              to="/"
              className="inline-block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm hover:brightness-110 transition"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Success;
