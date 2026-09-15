import { Link } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import edition1 from "@/assets/edition-1.jpg";
import edition2 from "@/assets/edition-2.jpg";
import edition3 from "@/assets/edition-3.jpg";
import edition4 from "@/assets/edition-4.jpg";
import edition5 from "@/assets/edition-5.jpg";
import edition6 from "@/assets/edition-6.jpg";
import edition7 from "@/assets/edition-7.jpg";
import edition8 from "@/assets/edition-8.jpg";
import edition9 from "@/assets/edition-9.jpg";
import edition10 from "@/assets/edition-10.jpg";
import edition11 from "@/assets/edition-11.jpg";
import edition12 from "@/assets/edition-12.png";
import edition13 from "@/assets/edition-13.jpg";
import edition14 from "@/assets/edition-14.jpg";
import edition15 from "@/assets/edition-15.jpg";

export interface Edition {
  num: number;
  date: string;
  title: string;
  desc: string;
  img: string;
}

/**
 * PAST / COMPLETED EDITIONS
 * ---------------------------------------------------------
 * This is the ONE place to update after every edition.
 * About.tsx and Vendor.tsx both read this list (indirectly,
 * via src/data/editions.ts) so nothing else needs editing.
 */
export const editions: Edition[] = [
  { num: 14, date: "Sat 5th September 2026", title: "Ede Edition", desc: "The movement crossed into Osun State — Otown Party took over Ideal Hotels and Bar, Ede for one unforgettable night.", img: edition14 },
  { num: 13, date: "Sat 1st August 2026", title: "Faaji Extra", desc: "Faaji Extra took over Durbar Stadium, Oyo — one night of extra everything: sound, culture and pure rave energy.", img: edition13 },
  { num: 12, date: "Sat 27th June 2026", title: "Iseyin Edition", desc: "The movement moved to Iseyin — one night of rave, culture and connection under the stars at Silver ZB Resort.", img: edition12 },
  { num: 11, date: "Sat 30th May 2026", title: "Glow in the 90s — Chapter II", desc: "The Anniversary Edition — a neon-soaked 90s throwback that lit up Oyo Durbar Stadium.", img: edition11 },
  { num: 10, date: "Sat 21st March 2026", title: "Denim After Dark", desc: "A Decade of Raving — the 10th edition at Oyo Durbar Stadium.", img: edition10 },
  { num: 9, date: "Tue 30th Dec 2025", title: "POTY", desc: "Party of the Year returned — closing out 2025 at Labamba Resort, Oyo.", img: edition9 },
  { num: 8, date: "Sat 25th Oct 2025", title: "Haunted Groove Halloween", desc: "The scariest night of the year — Haunted Groove at Labamba Resort celebrates African culture.", img: edition8 },
  { num: 7, date: "Sat 31st May 2025", title: "Owambe Edition", desc: "1 Year Anniversary — the Owambe Edition celebrated African culture in full colour.", img: edition7 },
  { num: 6, date: "Sat 15th Feb 2025", title: "XOXO Edition", desc: "The ultimate year-ender — Party of the Year at Labamba Resort.", img: edition6 },
  { num: 5, date: "Sat 21st Dec 2024", title: "Party of the Year", desc: "A spine-chilling Halloween celebration at Labamba Resort.", img: edition5 },
  { num: 4, date: "Sat 26th Oct 2024", title: "Halloween: Terror By Night", desc: "The flyest wave hit Labamba Resort.", img: edition4 },
  { num: 3, date: "Sat 14th Sept 2024", title: "Y2K Edition", desc: "A retro-futuristic throwback — the flyest wave hit Labamba Resort.", img: edition3 },
  { num: 2, date: "Sat 22nd June 2024", title: "Frenzy Edition", desc: "The energy tripled — the Frenzy Edition took Labamba Resort by storm.", img: edition2 },
  { num: 1, date: "Sat 27th April 2024", title: "The Genesis", desc: "Where it all began — music, games, dance, drink, and connect at the very first Otown Party.", img: edition1 },
];

export interface NextEdition {
  num: number;
  title: string;
  desc: string;
  /** Long display form, e.g. "Sat 1st August 2026" */
  date: string;
  /** Short display form, e.g. "August 1, 2026" */
  shortDate: string;
  time: string;
  venue: string;
  img: string;
}

/**
 * UPCOMING / NEXT EDITION (the spotlight card below)
 * ---------------------------------------------------------
 * Update this whenever a new edition is announced. Once that
 * edition happens, move its details into `editions` above as
 * the new first entry, then fill this in with the following
 * edition's details.
 */
export const nextEdition: NextEdition = {
  num: 15,
  title: "Afro All Black Edition",
  desc: "All black, all Afro. Music, games, dance, drink and connect — Otown Party returns to Oyo Durbar Stadium for the blackest, boldest night yet.",
  date: "Sat 17th October 2026",
  shortDate: "October 17, 2026",
  time: "6PM–4AM",
  venue: "Oyo Durbar Stadium, Oyo State",
  img: edition15,
};

const Events = () => {
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
                  Get Tickets Now
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
