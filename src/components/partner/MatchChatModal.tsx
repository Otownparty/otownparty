import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flag, Send, Ticket } from "lucide-react";
import ReportDialog from "./ReportDialog";

const db = supabase as any;

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const MatchChatModal = ({
  match,
  currentUserId,
  onClose,
}: {
  match: { id: string; user_a: string; user_b: string; chat_expires_at: string };
  currentUserId: string;
  onClose: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;
  const expired = secondsLeft <= 0;

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(match.chat_expires_at).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.chat_expires_at]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partner_messages",
          filter: `match_id=eq.${match.id}`,
        },
        (payload: any) => {
          setMessages((m) => [...m, payload.new]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await db
      .from("partner_messages")
      .select("*")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data ?? []);
  };

  const send = async () => {
    if (!draft.trim() || expired) return;
    const content = draft.trim();
    setDraft("");
    // RLS also enforces chat_expires_at server-side — this client check is
    // just for UX, not the actual safeguard.
    const { error } = await db.from("partner_messages").insert({
      match_id: match.id,
      sender_id: currentUserId,
      content,
    });
    if (error) toast.error("Message didn't send — chat may have ended");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md flex flex-col h-[560px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display">It's a match! 🎉</DialogTitle>
            <button
              onClick={() => setShowReport(true)}
              className="text-foreground/40 hover:text-destructive"
            >
              <Flag size={16} />
            </button>
          </div>
          <div
            className={`text-sm font-mono mt-1 ${
              expired ? "text-destructive" : secondsLeft < 60 ? "text-secondary" : "text-foreground/60"
            }`}
          >
            {expired ? "Chat ended" : `Time left: ${formatTime(secondsLeft)}`}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm animate-fade-up ${
                m.sender_id === currentUserId
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {expired ? (
          <div className="p-4 border-t border-border space-y-3">
            <p className="text-center text-sm text-foreground/60">
              This chat has ended. Hope you worked something out!
            </p>
            <Link
              to="/tickets"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition"
            >
              <Ticket size={16} /> Matched? Grab your tickets together
            </Link>
          </div>
        ) : (
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              placeholder="Say hi..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button size="icon" onClick={send}>
              <Send size={16} />
            </Button>
          </div>
        )}
      </DialogContent>

      {showReport && (
        <ReportDialog
          reportedUserId={otherUserId}
          currentUserId={currentUserId}
          onClose={() => setShowReport(false)}
        />
      )}
    </Dialog>
  );
};

export default MatchChatModal;
