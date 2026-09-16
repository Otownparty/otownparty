import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Images, Flame, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";

import ScrollReveal from "@/components/ScrollReveal";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo-trans.png";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";

const stats = [
  { value: "14", label: "Editions Hosted" },
  { value: "5K+", label: "Ravers Per Edition" },
  { value: "50+", label: "Artists Featured" },
  { value: "1", label: "Movement" },
];

const teaserCards = [
  {
    icon: Calendar,
    title: "Our Editions",
    desc: "From the Genesis to A Decade of Raving — explore every chapter.",
    link: "/events",
  },
  {
    icon: Flame,
    title: "The Movement",
    desc: "O'town Party is an outdoor party set to promote entertainment in Oyo town, foster friendship, unity and peace amongst the youth, showcase talents, fashion, art, creativity and create a platform that connects and promotes building lucrative networks among people.",
    link: "/about",
  },
  {
    icon: Images,
    title: "Gallery",
    desc: "Captured moments of energy, colour, and community.",
    link: "/gallery",
  },
];

const Index = () => {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <img src={heroBg} alt="Otown Party concert crowd" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background/95" />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />

          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center space-y-6">
            <img src={logo} alt="Otown Party Logo" className="mx-auto h-40 sm:h-52 lg:h-64 w-auto" />
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-foreground leading-tight tracking-tight font-display">
              Otown Party
            </h1>
            <p className="text-gradient-brand text-2xl sm:text-3xl font-semibold tracking-wide">
              Let's Rave
            </p>
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Otown Party 15.0 · Afro All Black Edition · 17th October 2026
            </p>
            <div className="w-full flex flex-col items-center gap-4 py-4">
              <CountdownTimer />
              <div className="flex flex-wrap gap-4 justify-center text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> Sat 17th Oct · 6PM–4AM</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> Oyo Durbar Stadium, Oyo</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link
                to="/tickets"
                className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
              >
                Get Tickets Now
              </Link>
              <Link to="/gallery" className="px-8 py-3.5 rounded-lg border border-foreground/30 text-foreground font-semibold text-sm hover:border-primary hover:text-primary transition-all">
                View Past Moments
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">The Movement</p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Africa's Premier Rave Experience</h2>
              <p className="text-muted-foreground max-w-2xl mb-12 leading-relaxed">
                What started as a bold vision has grown into 14 iconic editions — each one more electrifying than the last. Otown Party is more than an event. It's a movement.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {teaserCards.map((card) => (
                <ScrollReveal key={card.title}>
                  <Link to={card.link} className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
                    <card.icon className="text-primary mb-4" size={28} />
                    <h3 className="font-display font-bold text-lg text-foreground mb-2">{card.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{card.desc}</p>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Explore <ArrowRight size={14} />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-card border border-border rounded-xl p-8 mb-16">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl sm:text-4xl font-display font-bold text-primary">{s.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[gallery1, gallery2, gallery3, gallery4].map((img, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg">
                    <img src={img} alt={`Otown Party moment ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link to="/gallery" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all">
                  View Full Gallery <ArrowRight size={14} />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Index;
