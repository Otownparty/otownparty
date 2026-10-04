import { Loader2, MessageCircle } from "lucide-react";
import type { InboxMatch } from "@/hooks/usePartnerInbox";

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const Inbox = ({
  matches, loading, currentUserId, onOpen, onDiscover,
}: {
  matches: InboxMatch[]; loading: boolean; currentUserId: string;
  onOpen: (m: InboxMatch) => void; onDiscover: () => void;
}) => {
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }
  if (!matches.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <MessageCircle className="mx-auto text-foreground/30" size={40} />
        <p className="text-foreground/60">No matches yet. Keep swiping to find your raver.</p>
        <button onClick={onDiscover} className="text-primary text-sm font-semibold hover:underline">Start swiping</button>
      </div>
    );
  }

  const fresh = matches.filter((m) => !m.lastMessage);
  const convos = matches.filter((m) => m.lastMessage);

  return (
    <div className="space-y-6 animate-fade-up">
      {fresh.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/50 mb-3">New matches</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {fresh.map((m) => (
              <button key={m.id} onClick={() => onOpen(m)} className="flex flex-col items-center gap-1 shrink-0 group">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-primary to-secondary">
                  <img src={m.other?.photo_urls?.[0]} alt="" className="w-full h-full rounded-full object-cover border-2 border-background" />
                </div>
                <span className="text-xs text-foreground/70 group-hover:text-primary">{m.other?.display_name ?? "Raver"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {convos.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Messages</p>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
            {convos.map((m) => {
              const expired = !!m.chat_expires_at && new Date(m.chat_expires_at).getTime() < Date.now();
              const mine = m.lastMessage?.sender_id === currentUserId;
              return (
                <button key={m.id} onClick={() => onOpen(m)}
                  className={`w-full flex items-center gap-3 p-3 text-left transition hover:bg-primary/5 ${m.unread ? "bg-primary/10" : ""}`}>
                  <img src={m.other?.photo_urls?.[0]} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate ${m.unread ? "font-semibold" : ""}`}>{m.other?.display_name ?? "Raver"}</span>
                      <span className="text-xs text-foreground/40 shrink-0">{timeAgo(m.lastMessage!.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${m.unread ? "text-foreground" : "text-foreground/50"}`}>
                        {mine ? "You: " : ""}{m.lastMessage!.content}
                      </span>
                      {m.unread > 0 ? (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{m.unread}</span>
                      ) : expired ? (
                        <span className="text-[10px] uppercase text-foreground/30">ended</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
