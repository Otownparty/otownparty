import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewableProfile = {
  display_name: string | null;
  age: number | null;
  gender?: string | null;
  looking_for?: string[] | null;
  bio?: string | null;
  photo_urls?: string[] | null;
};

const ProfileSheet = ({ profile, onClose, onPass, onLike }: {
  profile: ViewableProfile; onClose: () => void; onPass?: () => void; onLike?: () => void;
}) => {
  const photos = profile.photo_urls?.filter(Boolean) ?? [];
  const [i, setI] = useState(0);
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length);

  return (
    <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[4/5] bg-muted">
          <AnimatePresence mode="wait">
            {photos[i] && (
              <motion.img key={photos[i]} src={photos[i]} alt={`${profile.display_name ?? "Raver"} photo ${i + 1}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                drag={photos.length > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
                className="w-full h-full object-cover" draggable={false} />
            )}
          </AnimatePresence>
          {photos.length > 1 && (
            <>
              <div className="absolute top-2 inset-x-3 flex gap-1">
                {photos.map((_, k) => (
                  <span key={k} className={`h-1 flex-1 rounded-full ${k === i ? "bg-primary" : "bg-foreground/30"}`} />
                ))}
              </div>
              <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:text-primary"><ChevronLeft size={18} /></button>
              <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:text-primary"><ChevronRight size={18} /></button>
            </>
          )}
          <button onClick={onClose} aria-label="Close profile" className="absolute top-5 right-3 p-2 rounded-full bg-background/70 hover:text-primary"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <h3 className="font-display text-2xl">{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h3>
            {profile.gender && <p className="text-xs text-foreground/50">{profile.gender}</p>}
          </div>
          {profile.bio && (
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40 mb-1">About</p>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
          {!!profile.looking_for?.length && (
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40 mb-1">Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.looking_for.map((l) => <span key={l} className="text-xs px-2.5 py-1 rounded-full border border-border">{l}</span>)}
              </div>
            </div>
          )}
          {(onPass || onLike) && (
            <div className="flex justify-center gap-6 pt-2">
              {onPass && <Button size="icon" variant="outline" aria-label="Pass" className="rounded-full w-14 h-14 border-destructive/50 hover:bg-destructive/10" onClick={onPass}><X className="text-destructive" /></Button>}
              {onLike && <Button size="icon" aria-label="Like" className="rounded-full w-14 h-14 bg-primary hover:brightness-110" onClick={onLike}><Heart /></Button>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSheet;
