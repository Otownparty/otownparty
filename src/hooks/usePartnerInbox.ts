import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type InboxMatch = {
  id: string;
  user_a: string;
  user_b: string;
  chat_expires_at: string | null;
  created_at: string;
  other: { user_id: string; display_name: string; age: number; photo_urls: string[]; bio: string } | null;
  lastMessage: { content: string; sender_id: string; created_at: string } | null;
  unread: number;
};

export function usePartnerInbox(userId: string | undefined, openChatId: string | null) {
  const [matches, setMatches] = useState<InboxMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMatch, setNewMatch] = useState<InboxMatch | null>(null);
  const openRef = useRef(openChatId);
  openRef.current = openChatId;

  const load = useCallback(async () => {
    if (!userId) return;
    const { data: ms } = await db
      .from("partner_matches").select("*")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("created_at", { ascending: false });
    const list = ms ?? [];
    if (!list.length) { setMatches([]); setLoading(false); return []; }
    const ids = list.map((m: any) => m.id);
    const otherIds = list.map((m: any) => (m.user_a === userId ? m.user_b : m.user_a));
    const [{ data: profs }, { data: msgs }, { data: reads }] = await Promise.all([
      db.from("partner_profiles").select("user_id, display_name, age, photo_urls, bio").in("user_id", otherIds),
      db.from("partner_messages").select("match_id, sender_id, content, created_at").in("match_id", ids).order("created_at", { ascending: true }),
      db.from("partner_match_reads").select("match_id, last_read_at").eq("user_id", userId),
    ]);
    const readMap = new Map((reads ?? []).map((r: any) => [r.match_id, r.last_read_at]));
    const result: InboxMatch[] = list.map((m: any) => {
      const otherId = m.user_a === userId ? m.user_b : m.user_a;
      const mm = (msgs ?? []).filter((x: any) => x.match_id === m.id);
      const lastRead = readMap.get(m.id) as string | undefined;
      const unread = mm.filter((x: any) => x.sender_id !== userId && (!lastRead || x.created_at > lastRead)).length;
      return {
        ...m,
        other: (profs ?? []).find((p: any) => p.user_id === otherId) ?? null,
        lastMessage: mm[mm.length - 1] ?? null,
        unread: openRef.current === m.id ? 0 : unread,
      };
    });
    result.sort((a, b) => (b.lastMessage?.created_at ?? b.created_at).localeCompare(a.lastMessage?.created_at ?? a.created_at));
    setMatches(result);
    setLoading(false);
    return result;
  }, [userId]);

  const markRead = useCallback(async (matchId: string) => {
    if (!userId) return;
    setMatches((cur) => cur.map((m) => (m.id === matchId ? { ...m, unread: 0 } : m)));
    await db.from("partner_match_reads").upsert(
      { match_id: matchId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "match_id,user_id" }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`partner-inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "partner_matches" }, async (p: any) => {
        const row = p.new;
        if (row.user_a !== userId && row.user_b !== userId) return;
        const fresh = await load();
        const m = fresh?.find((x) => x.id === row.id);
        if (m) setNewMatch(m);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "partner_messages" }, (p: any) => {
        const msg = p.new;
        if (openRef.current === msg.match_id) markRead(msg.match_id);
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load, markRead]);

  const totalUnread = matches.reduce((n, m) => n + m.unread, 0);
  return { matches, loading, totalUnread, markRead, newMatch, clearNewMatch: () => setNewMatch(null), reload: load };
}
