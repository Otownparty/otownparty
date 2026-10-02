import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flag, Minus, Send, Ticket, X, ChevronLeft } from "lucide-react";
import ReportDialog from "./ReportDialog";
import type { InboxMatch } from "@/hooks/usePartnerInbox";

const db = supabase as any;

type Message = { id: string; match_id: string; sender_id: string; content: string; created_at: string };

const ICEBREAKERS = [
  "Afrobeats or Amapiano? 🎶",
  "Who's your must-hear DJ tonight?",
  "What are you wearing for the all black? 🖤",
  "Wanna link up at the gate?",
  "First drink's on who? 😄",
];

const fmt = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

const ChatPanel = ({
  match, currentUserId, minimized, unread, onMinimize, onRestore, onClose, onRead,
}: {
  match: InboxMatch; currentUserId: string; minimized: boolean; unread: number;
  onMinimize: () => void; onRestore: () => void; onClose: () => void; onRead: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;
  const expired = secondsLeft <= 0;
  const name = match.other?.display_name ?? "Raver";
  const photo = match.other?.photo_urls?.[0];

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((new Date(match.chat_expires_at).getTime() - Date.now()) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [match.chat_expires_at]);

  useEffect(() => {
    db.from("partner_messages").select("*").eq("match_id", match.id).order("created_at", { ascending: true })
      .then(({ data }: any) => setMessages(data ?? []));
    const ch = supabase.channel(`chat-${match.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "partner_messages", filter: `match_id=eq.${match.id}` },
        (p: any) => setMessages((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match.id]);

  useEffect(() => {
    if (!minimized) { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); onRead(); }
  }, [messages.length, minimized]);

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || expired) return;
    if (!text) setDraft("");
    const { data, error } = await db.from("partner_messages")
      .insert({ match_id: match.id, sender_id: currentUserId, content: content.slice(0, 500) })
      .select().single();
    if (error) return toast.error("Message didn't send — chat may have ended");
    setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  };

  if (minimized) {
    return (
      <button onClick={onRestore}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 pl-1 pr-4 py-1 rounded-full bg-card border border-primary/40 shadow-lg animate-fade-up hover:border-primary">
        <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-sm font-semibold">{name}</span>
        {!expired && <span className="text-xs font-mono text-foreground/50">{fmt(secondsLeft)}</span>}
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{unread}</span>}
      </button>
    );
  }

  return (
    <div className="fixed z-50 inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[380px] sm:h-[560px] flex flex-col bg-card sm:border border-border sm:rounded-2xl shadow-2xl animate-fade-up overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
        <button onClick={onClose} className="sm:hidden text-foreground/60 hover:text-primary" aria-label="Back"><ChevronLeft size={20} /></button>
        <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{name}{match.other?.age ? `, ${match.other.age}` : ""}</p>
          <p className={`text-xs font-mono ${expired ? "text-destructive" : secondsLeft < 60 ? "text-secondary" : "text-foreground/50"}`}>
            {expired ? "Chat ended" : `Chat ends in ${fmt(secondsLeft)}`}
          </p>
        </div>
        <button onClick={() => setShowReport(true)} className="p-1.5 text-foreground/40 hover:text-primary" aria-label="Report"><Flag size={16} /></button>
        <button onClick={onMinimize} className="p-1.5 text-foreground/60 hover:text-primary" aria-label="Minimize"><Minus size={18} /></button>
        <button onClick={onClose} className="p-1.5 text-foreground/60 hover:text-primary hidden sm:block" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
            <p className="font-display text-lg">You matched with {name} 🎉</p>
            {match.other?.bio && <p className="text-sm text-foreground/50 mt-1 px-4">"{match.other.bio}"</p>}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm break-words ${
            m.sender_id === currentUserId ? "ml-auto bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {expired ? (
        <div className="p-4 border-t border-border space-y-3">
          <p className="text-center text-sm text-foreground/60">This chat has ended. Hope you linked up!</p>
          <Link to="/tickets" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition">
            <Ticket size={16} /> Grab your tickets together
          </Link>
        </div>
      ) : (
        <div className="border-t border-border">
          {messages.length < 2 && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-3">
              {ICEBREAKERS.map((t) => (
                <button key={t} onClick={() => send(t)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border text-foreground/70 hover:border-primary hover:text-primary">{t}</button>
              ))}
            </div>
          )}
          <div className="p-3 flex gap-2">
            <Input placeholder="Say hi..." value={draft} maxLength={500}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <Button size="icon" onClick={() => send()}><Send size={16} /></Button>
          </div>
        </div>
      )}

      {showReport && <ReportDialog reportedUserId={otherUserId} currentUserId={currentUserId} onClose={() => setShowReport(false)} />}
    </div>
  );
};

export default ChatPanel;
