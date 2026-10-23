import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { editions as initialPast, nextEdition as initialEvent } from "@/data/staticEditions";
import { editionKey, type EventDetails } from "@/lib/eventEdition";

export const fallbackEvent: EventDetails = { ...initialEvent, startsAt: "2026-10-17T17:00:00Z", prices: { "Early Bird": 4000, Regular: 5000, "VIP Experience": 15000 }, contacts: "07031557505, 08139256694", salesOpen: true };
const EventContext = createContext({ event: fallbackEvent, editions: initialPast, ready: false, error: "", refresh: async () => {} });

export function EventEditionProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState(fallbackEvent);
  const [editions, setEditions] = useState(initialPast);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    const { data, error: fetchError } = await supabase.from("event_editions").select("edition, details, active");
    if (fetchError) { setError("Event details could not be loaded. Please try again."); setReady(false); return; }
    const active = data?.find((row) => row.active);
    const current = active ? active.details as unknown as EventDetails : fallbackEvent;
    setEvent(current);
    const past = new Map(initialPast.map((ed) => [ed.num, ed]));
    if (current.num !== fallbackEvent.num) past.set(fallbackEvent.num, fallbackEvent);
    for (const row of data ?? []) {
      const ed = row.details as unknown as EventDetails;
      if (!row.active && ed.num < current.num) past.set(ed.num, ed);
    }
    past.delete(current.num);
    setEditions([...past.values()].sort((a, b) => b.num - a.num));
    setError(""); setReady(true);
  };
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { clearInterval(id); window.removeEventListener("focus", focus); };
  }, []);
  useEffect(() => {
    document.title = `${editionKey(event).replace(" - ", " – ")} | ${event.shortDate}`;
    const description = `${event.title} · ${event.date} · ${event.time} · ${event.venue}. Let's Rave.`;
    for (const [attribute, key, value] of [
      ["name", "description", description], ["property", "og:title", document.title],
      ["property", "og:description", description], ["property", "og:type", "website"],
      ["name", "twitter:card", "summary_large_image"], ["name", "twitter:title", document.title],
      ["name", "twitter:description", description],
    ]) {
      let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attribute, key); document.head.appendChild(tag); }
      tag.setAttribute("content", value);
    }
  }, [event]);
  return <EventContext.Provider value={{ event, editions, ready, error, refresh }}>{children}</EventContext.Provider>;
}
export const useEventEdition = () => useContext(EventContext);