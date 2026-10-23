import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
export const INITIAL_EDITION = "Otown Party 15.0 - Afro All Black Edition";
const initial = { num: 15, title: "Afro All Black Edition", date: "Sat 17th October 2026", shortDate: "October 17, 2026", time: "6PM–4AM", venue: "Oyo Durbar Stadium, Oyo State", startsAt: "2026-10-17T17:00:00Z", prices: { "Early Bird": 4000, Regular: 5000, "VIP Experience": 15000 } as Record<string, number>, salesOpen: true };
export async function getEvent(client: SupabaseClient<any>, edition?: string) {
  let query = client.from("event_editions").select("edition, details");
  query = edition ? query.eq("edition", edition) : query.eq("active", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Event settings could not be loaded");
  if (data) return { ...data.details, edition: data.edition } as typeof initial & { edition: string };
  if (!edition || edition === INITIAL_EDITION) return { ...initial, edition: INITIAL_EDITION };
  // Never label a historic ticket as the newest event.
  return { ...initial, num: 0, title: edition, date: "", shortDate: "", time: "", venue: "", edition };
}
export const escapeEventHtml = (s: string) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export const eventEmailHeading = (event: Awaited<ReturnType<typeof getEvent>>) => escapeEventHtml(event.edition.split(" - ")[0]);
export const eventEmailSummary = (event: Awaited<ReturnType<typeof getEvent>>) => escapeEventHtml([event.title, event.date, event.time, event.venue].filter(Boolean).join(" · "));