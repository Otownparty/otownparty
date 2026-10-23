import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import aboutImg from "@/assets/about-party.jpg";
import { useEventEdition } from "@/hooks/useEventEdition";
const values = [
  { num: "01", title: "Culture First", desc: "Every decision honours African culture — in sound, style, and space." },
  { num: "02", title: "Community", desc: "Building belonging where every raver feels seen and celebrated." },
  { num: "03", title: "Excellence", desc: "Premium production, world-class curation, relentless attention to detail." },
  { num: "04", title: "Expression", desc: "Fashion, art, music — a canvas for unfiltered African self-expression." },
  { num: "05", title: "Security", desc: "At O'town Party, your safety is just as important as your experience. We are committed to creating a fun, secure, and well-controlled environment for everyone." },
  { num: "06", title: "Trained Security Personnel", desc: "Professional security teams will be present at all entry points and within the venue to ensure order and safety throughout the event." },
  { num: "07", title: "Access Control", desc: "Strict ticket verification and controlled entry systems will be enforced. No valid ticket, no entry." },
  { num: "08", title: "Zero Tolerance Policy", desc: "We maintain zero tolerance for violence, harassment, theft, or any disruptive behavior. Offenders will be immediately removed." },
  { num: "09", title: "Personal Responsibility", desc: "Guests are advised to stay aware of their surroundings, keep personal belongings secure, and drink responsibly." },
  { num: "10", title: "Emergency Response", desc: "First aid support and emergency response measures will be available on-site at all times." },
  { num: "11", title: "Safe Space for All", desc: "O'town Party promotes respect, inclusivity, and positive vibes. Everyone deserves to feel safe and enjoy the moment." },
];
const About = () => {
  const { editions } = useEventEdition();
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">About</p>
            <h1 className="text-4xl sm:text-6xl font-display font-bold text-foreground mb-16">The Movement</h1>
          </ScrollReveal>
          {/* Origin */}
          <div className="grid md:grid-cols-2 gap-12 mb-20 items-center">
            <ScrollReveal>
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-foreground">Where It All Began</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Otown Party was born from a desire to create a space where African urban culture could breathe freely — where music, fashion, and community converge without compromise.
                </p>
                <h2 className="text-2xl font-display font-bold text-foreground pt-4">More Than a Party — A Cultural Statement</h2>
                <p className="text-muted-foreground leading-relaxed">
                  O'town Party is an outdoor party set to promote entertainment in Oyo town, foster friendship, unity and peace amongst the youth, showcase talents, fashion, art, creativity and create a platform that connects and promotes building lucrative networks among people.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <div className="rounded-2xl overflow-hidden">
                <img src={aboutImg} alt="Otown Party atmosphere" className="w-full h-full object-cover" loading="lazy" width={1024} />
              </div>
            </ScrollReveal>
          </div>
          {/* Milestone */}
          <ScrollReveal>
            <div className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-8 mb-20">
              <h3 className="text-xl font-display font-bold text-foreground mb-2">{editions.length} Successful Editions and Growing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Reaching {editions.length} editions is not just a number — it is proof that African urban culture is a force that unites, inspires, and endures. Each edition has been a chapter in a story that continues to unfold.
              </p>
            </div>
          </ScrollReveal>
          {/* Values */}
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-8">Our Values</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v) => (
              <ScrollReveal key={v.num}>
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-all">
                  <span className="text-primary font-display font-bold text-sm">{v.num}</span>
                  <h3 className="font-display font-bold text-lg text-foreground mt-2 mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};
export default About;
