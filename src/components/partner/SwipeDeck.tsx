import { useEffect, useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Loader2, X, Heart, Flag } from "lucide-react";
import ReportDialog from "./ReportDialog";

const db = supabase as any;

type Candidate = {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  bio: string;
  photo_urls: string[];
};

const SWIPE_THRESHOLD = 120;

const SwipeDeck = ({ currentUserId }: { currentUserId: string }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<Candidate | null>(null);
  const controls = useAnimation();

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data: swiped } = await db
        .from("partner_swipes")
        .select("swiped_id")
        .eq("swiper_id", currentUserId);
      const { data: blocked } = await db
        .from("partner_blocks")
        .select("blocked_id, blocker_id")
        .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

      const excludeIds = new Set<string>([
        currentUserId,
        ...(swiped ?? []).map((s: any) => s.swiped_id),
        ...(blocked ?? []).flatMap((b: any) => [b.blocker_id, b.blocked_id]),
      ]);

      const { data, error } = await db
        .from("partner_profiles")
        .select("id, user_id, display_name, age, bio, photo_urls")
        .eq("status", "approved")
        .limit(50);
      if (error) throw error;

      setCandidates((data ?? []).filter((c: Candidate) => !excludeIds.has(c.user_id)));
    } catch (err: any) {
      toast.error("Couldn't load profiles");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const recordSwipe = async (candidate: Candidate, direction: "left" | "right") => {
    const { error } = await db.from("partner_swipes").insert({
      swiper_id: currentUserId,
      swiped_id: candidate.user_id,
      direction,
    });
    if (error) {
      toast.error("Swipe failed, try again");
      console.error(error);
      return;
    }
    setCandidates((c) => c.filter((x) => x.id !== candidate.id));
    // Matching itself is handled by a DB trigger (see Lovable prompt) that
    // creates a partner_matches row when both sides swipe right — the
    // Partner page listens for that via realtime.
  };

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
    candidate: Candidate
  ) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      controls.start({ x: 500, opacity: 0, rotate: 15, transition: { duration: 0.3 } });
      setTimeout(() => recordSwipe(candidate, "right"), 150);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      controls.start({ x: -500, opacity: 0, rotate: -15, transition: { duration: 0.3 } });
      setTimeout(() => recordSwipe(candidate, "left"), 150);
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 300 } });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-20 text-foreground/60">
        No new profiles right now — check back soon.
      </div>
    );
  }

  const top = candidates[0];
  const next = candidates[1];

  return (
    <div className="relative h-[480px] flex items-center justify-center">
      {next && (
        <div className="absolute w-full max-w-sm h-[440px] bg-card border border-border rounded-2xl scale-[0.96] opacity-60" />
      )}

      <motion.div
        key={top.id}
        className="absolute w-full max-w-sm h-[440px] bg-card border border-border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        animate={controls}
        onDragEnd={(e, info) => handleDragEnd(e, info, top)}
        whileDrag={{ scale: 1.02 }}
      >
        <img
          src={top.photo_urls[0]}
          className="w-full h-72 object-cover pointer-events-none"
          draggable={false}
        />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">
              {top.display_name}, {top.age}
            </h3>
            <button
              onClick={() => setReportTarget(top)}
              className="text-foreground/40 hover:text-destructive"
            >
              <Flag size={16} />
            </button>
          </div>
          <p className="text-sm text-foreground/60 mt-1">{top.bio}</p>
        </div>
      </motion.div>

      <div className="absolute bottom-[-64px] flex gap-6">
        <Button
          size="icon"
          variant="outline"
          className="rounded-full w-14 h-14 border-destructive/50 hover:bg-destructive/10"
          onClick={() => {
            controls.start({ x: -500, opacity: 0, rotate: -15, transition: { duration: 0.3 } });
            setTimeout(() => recordSwipe(top, "left"), 150);
          }}
        >
          <X className="text-destructive" />
        </Button>
        <Button
          size="icon"
          className="rounded-full w-14 h-14 bg-primary hover:brightness-110"
          onClick={() => {
            controls.start({ x: 500, opacity: 0, rotate: 15, transition: { duration: 0.3 } });
            setTimeout(() => recordSwipe(top, "right"), 150);
          }}
        >
          <Heart />
        </Button>
      </div>

      {reportTarget && (
        <ReportDialog
          reportedUserId={reportTarget.user_id}
          currentUserId={currentUserId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};

export default SwipeDeck;
