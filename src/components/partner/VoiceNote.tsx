import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const VoiceNote = ({ path, duration, mine }: { path: string; duration?: number | null; mine: boolean }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const total = duration || 0;

  useEffect(() => {
    supabase.storage.from("partner-voice").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) a.pause(); else a.play().catch(() => {});
  };

  return (
    <div className="flex items-center gap-2 min-w-[170px]">
      <button onClick={toggle} disabled={!url} aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mine ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"}`}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className={`flex-1 h-1 rounded-full ${mine ? "bg-primary-foreground/30" : "bg-foreground/20"}`}>
        <div className={`h-full rounded-full ${mine ? "bg-primary-foreground" : "bg-primary"}`} style={{ width: `${total ? Math.min(100, (pos / total) * 100) : 0}%` }} />
      </div>
      <span className="text-[11px] font-mono opacity-70">{fmt(playing || pos ? pos : total)}</span>
      {url && (
        <audio ref={audio} src={url} preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPos(0); }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} />
      )}
    </div>
  );
};

export default VoiceNote;
