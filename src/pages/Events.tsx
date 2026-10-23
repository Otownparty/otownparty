import { Link } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useEventEdition } from "@/hooks/useEventEdition";
export { editions, nextEdition } from "@/data/staticEditions";
export type { Edition, NextEdition } from "@/data/staticEditions";

const Events = () => {
  const { event: nextEdition, editions } = useEventEdition();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Events & Lineup</p>
            <h1 className="text-4xl sm:text-6xl font-display font-bold text-foreground mb-4">Our Editions & Lineup</h1>
            <p className="text-muted-foreground max-w-2xl mb-16 leading-relaxed">{editions.length} iconic chapters. Each one a statement. Together, they tell the story of a movement.</p>
          </ScrollReveal>

          {/* Spotlight — Next Edition */}
          <ScrollReveal>
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-20 border-l-4 border-l-primary grid md:grid-cols-2">
              <div className="aspect-[4/5] md:aspect-auto overflow-hidden">
                <img src={nextEdition.img} alt={`Otown Party ${nextEdition.num}.0 — ${nextEdition.title}`} className="w-full h-full object-cover" />
              </div>
              <div className="p-8 md:p-12">
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  Next Edition · Tickets Live
                </span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">Otown Party {nextEdition.num}.0 — {nextEdition.title}</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">{nextEdition.desc}</p>
                <div className="flex flex-wrap gap-4 mb-8 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {nextEdition.date} · {nextEdition.time}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> {nextEdition.venue}</span>
                </div>
                <Link
                  to="/tickets"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition"
                >
                  Get Tickets Now 🎫
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Past Editions */}
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-8">{editions.length} Legendary Editions</h2>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {editions.map((ed) => {
              return (
                <ScrollReveal key={ed.num}>
                  <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={ed.img} alt={`Edition ${ed.num}: ${ed.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <span className="text-xs text-primary font-semibold uppercase tracking-wider">Edition {ed.num} · {ed.date}</span>
                      <h3 className="font-display font-bold text-lg text-foreground mt-1 mb-2">{ed.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{ed.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Events;
