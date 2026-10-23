import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { lastEditionPhotos } from "@/data/lastEditionPhotos";
import { previousEditionPhotos } from "@/data/previousEditionPhotos";
import { useGalleryPhotos } from "@/hooks/useGalleryPhotos";
import { defaultGalleryFilter, galleryFilters } from "@/lib/gallery";
import { Button } from "@/components/ui/button";

// ── Archive photos (gallery-1.jpg … gallery-38.jpg) ──────────────────────────
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";
import g8 from "@/assets/gallery-8.jpg";
import g9 from "@/assets/gallery-9.jpg";
import g10 from "@/assets/gallery-10.jpg";
import g11 from "@/assets/gallery-11.jpg";
import g12 from "@/assets/gallery-12.jpg";
import g13 from "@/assets/gallery-13.jpg";
import g14 from "@/assets/gallery-14.jpg";
import g15 from "@/assets/gallery-15.jpg";
import g16 from "@/assets/gallery-16.jpg";
import g17 from "@/assets/gallery-17.jpg";
import g18 from "@/assets/gallery-18.jpg";
import g19 from "@/assets/gallery-19.jpg";
import g20 from "@/assets/gallery-20.jpg";
import g21 from "@/assets/gallery-21.jpg";
import g22 from "@/assets/gallery-22.jpg";
import g23 from "@/assets/gallery-23.jpg";
import g24 from "@/assets/gallery-24.jpg";
import g25 from "@/assets/gallery-25.jpg";
import g26 from "@/assets/gallery-26.jpg";
import g27 from "@/assets/gallery-27.jpg";
import g28 from "@/assets/gallery-28.jpg";
import g29 from "@/assets/gallery-29.jpg";
import g30 from "@/assets/gallery-30.jpg";
import g31 from "@/assets/gallery-31.jpg";
import g32 from "@/assets/gallery-32.jpg";
import g33 from "@/assets/gallery-33.jpg";
import g34 from "@/assets/gallery-34.jpg";
import g35 from "@/assets/gallery-35.jpg";
import g36 from "@/assets/gallery-36.jpg";
import g37 from "@/assets/gallery-37.jpg";
import g38 from "@/assets/gallery-38.jpg";


type Photo = { src: string; alt: string; era: string };

const photos: Photo[] = [
  // ── Previous editions (All Editions only) ──────────────────────────────────
  { src: g1,  alt: "Flag waving in the crowd", era: "archive" },
  { src: g2,  alt: "Friends vibing in traditional attire", era: "archive" },
  { src: g3,  alt: "Smiles under the lights", era: "archive" },
  { src: g4,  alt: "DJ behind the decks", era: "archive" },
  { src: g5,  alt: "Crowd energy from the stage", era: "archive" },
  { src: g6,  alt: "Night panorama under the palms", era: "archive" },
  { src: g7,  alt: "Fashion moment at the rave", era: "archive" },
  { src: g8,  alt: "Team members in the crowd", era: "archive" },
  { src: g9,  alt: "Dancing under red lights", era: "archive" },
  { src: g10, alt: "Lost in the music", era: "archive" },
  { src: g11, alt: "Tie-dye fashion under the lights", era: "archive" },
  { src: g12, alt: "Massive crowd under amber glow", era: "archive" },
  { src: g13, alt: "Cool vibes in black and white", era: "archive" },
  { src: g14, alt: "Pure rave energy", era: "archive" },
  { src: g15, alt: "Smiling at the LED pyramid", era: "archive" },
  { src: g16, alt: "Bold fashion statements", era: "archive" },
  { src: g17, alt: "Otown Party neon sign", era: "archive" },
  { src: g18, alt: "Couple feeling the music", era: "archive" },
  { src: g19, alt: "Sea of ravers under spotlight", era: "archive" },
  { src: g20, alt: "Shades and vibes", era: "archive" },
  { src: g21, alt: "DJs on the stage", era: "archive" },
  { src: g22, alt: "Dancing queens on stage", era: "archive" },
  { src: g23, alt: "Haunted Groove edition style", era: "archive" },
  { src: g24, alt: "Crowd view from backstage", era: "archive" },
  { src: g25, alt: "Smooth moves on the dance floor", era: "archive" },
  { src: g26, alt: "Styled up on stage", era: "archive" },
  { src: g27, alt: "Aerial view of the rave", era: "archive" },
  { src: g28, alt: "Leopard print at the pyramid", era: "archive" },
  { src: g29, alt: "Drip duo at the light-up sign", era: "archive" },
  { src: g30, alt: "Black and white crowd panorama", era: "archive" },
  { src: g31, alt: "Red carpet at the Haunted Groove", era: "archive" },
  { src: g32, alt: "Red beret fashion moment", era: "archive" },
  { src: g33, alt: "Stage performance under coloured lights", era: "archive" },
  { src: g34, alt: "Percussionist on stage", era: "archive" },
  { src: g35, alt: "Crowd under blue lights", era: "archive" },
  { src: g36, alt: "Squad goals at the sign", era: "archive" },
  { src: g37, alt: "Female DJ in the zone", era: "archive" },
  { src: g38, alt: "MC commanding the crowd", era: "archive" },

  // ── Previous editions moved out of "Last Edition" (All Editions only) ──────
  ...previousEditionPhotos.map((p) => ({ ...p, era: "archive" })),

  // ── Last Edition (Cloudinary-hosted; shows in both All Editions and Last Edition) ──
  ...lastEditionPhotos.map((p) => ({ ...p, era: "last" })),
];

const filters = galleryFilters;

const Gallery = () => {
  const [filter, setFilter] = useState<string>(defaultGalleryFilter);
  const livePhotos = useGalleryPhotos(photos);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2500);
  }, []);

  const filtered =
    filter === "all" ? livePhotos : livePhotos.filter((p) => p.era === filter);

  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(
    () => setLightbox((i) => (i !== null && i > 0 ? i - 1 : filtered.length - 1)),
    [filtered.length]
  );
  const next = useCallback(
    () => setLightbox((i) => (i !== null && i < filtered.length - 1 ? i + 1 : 0)),
    [filtered.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    showControls();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") { showControls(); prev(); }
      if (e.key === "ArrowRight") { showControls(); next(); }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [lightbox, close, prev, next, showControls]);

  const handleDownload = useCallback(async (src: string, alt: string) => {
    try {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const safeName = alt.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50) || "otown-photo";
      a.href = url;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(src, "_blank");
    }
  }, []);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Gallery</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">Moments from the Movement</h1>
            <p className="text-muted-foreground max-w-2xl mb-8">A decade of energy, colour, and community — captured one frame at a time.</p>
          </ScrollReveal>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-10">
            {filters.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                aria-pressed={filter === f.value}
                onClick={() => { setLightbox(null); setFilter(f.value); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Grid */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map((photo, i) => (
              <ScrollReveal key={`${photo.src}-${i}`}>
                <button
                  onClick={() => setLightbox(i)}
                  className="block w-full overflow-hidden rounded-lg group"
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-auto brightness-75 group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                  />
                </button>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center"
          onClick={close}
          onMouseMove={showControls}
          onTouchStart={showControls}
        >
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className={`absolute top-6 right-6 z-10 text-foreground hover:text-primary transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-label="Close"
          >
            <X size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); showControls(); prev(); }}
            className={`absolute left-2 sm:left-4 z-10 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:text-primary transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-label="Previous"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); showControls(); next(); }}
            className={`absolute right-2 sm:right-4 z-10 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:text-primary transition-opacity duration-500 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-label="Next"
          >
            <ChevronRight size={32} />
          </button>
          <img
            src={filtered[lightbox].src}
            alt={filtered[lightbox].alt}
            className="max-w-[94vw] max-h-[78vh] object-contain rounded-lg"
            onClick={(e) => { e.stopPropagation(); showControls(); }}
          />
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDownload(filtered[lightbox].src, filtered[lightbox].alt)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg"
            >
              <Download size={18} />
              Download
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default Gallery;
