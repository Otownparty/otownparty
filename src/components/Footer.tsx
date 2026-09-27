import { Link } from "react-router-dom";
import { Instagram, Youtube } from "lucide-react";
import logo from "@/assets/logo-trans.png";
import { editions } from "@/data/editions";

const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="Otown Party" className="h-16 w-auto" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Africa's premium rave movement. Where culture meets the dancefloor.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Navigate</h4>
            <ul className="space-y-2">
              {["Home", "Events", "About", "Gallery", "Tickets"].map((l) => (
                <li key={l}>
                  <Link to={l === "Home" ? "/" : `/${l.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Past Editions */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Past Editions</h4>
            <ul className="space-y-2">
              {editions.map((ed) => `${ed.title} · ${ed.date.replace(/^\w+\s+\S+\s+/, "")}`).map((e) => (
                <li key={e}>
                  <Link to="/events" className="text-sm text-muted-foreground hover:text-primary transition-colors">{e}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4 text-foreground">Contact</h4>
            <a href="mailto:pr@otownparty.com" className="text-sm text-muted-foreground hover:text-primary transition-colors block mb-4">
              pr@otownparty.com
            </a>
            <div className="flex gap-4">

              {/* Instagram */}
              <a href="https://www.instagram.com/o_town_party?igsh=MWVrNTR2OWViMjl4cg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>

              {/* TikTok */}
              <a href="https://www.tiktok.com/@otown.party?_r=1&_t=ZS-95PD2A5A8wR" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.14a8.16 8.16 0 004.77 1.52V7.2a4.85 4.85 0 01-1-.51z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a href="https://youtube.com/@otownparty?si=HSjtK_yE06ik8Gp1" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube size={20} />
              </a>

              {/* WhatsApp - correct icon */}
              <a href="https://chat.whatsapp.com/L1XOSfBpM3uLL8CK07QgZY?mode=gi_t" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.38 1.26 4.8L2 22l5.44-1.43c1.37.75 2.93 1.17 4.6 1.17 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.53 0-2.96-.41-4.2-1.12l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 01-1.26-4.42c0-4.54 3.7-8.24 8.25-8.24 4.55 0 8.24 3.7 8.24 8.24 0 4.55-3.69 8.25-8.24 8.25zm4.52-6.17c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.12-.17.25-.63.8-.77.96-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.17 0-.43.06-.65.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.57.21-1.06.14-1.17-.06-.1-.22-.16-.47-.28z"/>
                </svg>
              </a>

            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 Otown Party. All rights reserved.</p>
          <p className="text-xs text-primary font-semibold tracking-wide">Proudly Celebrating African Urban Culture</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
