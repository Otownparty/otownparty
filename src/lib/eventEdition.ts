export type EventDetails = {
  num: number; title: string; desc: string; date: string; shortDate: string;
  time: string; venue: string; img: string; startsAt: string;
  prices: Record<string, number>; contacts: string; salesOpen: boolean;
};
export const editionKey = (event: Pick<EventDetails, "num" | "title">) => `Otown Party ${event.num}.0 - ${event.title}`;
export function validateEvent(event: EventDetails): string | null {
  if (!Number.isInteger(event.num) || event.num < 1) return "Enter a valid edition number";
  if (!event.title.trim() || !event.venue.trim() || !event.date.trim() || !event.time.trim()) return "Complete the title, date, time and venue";
  if (!Number.isFinite(Date.parse(event.startsAt))) return "Enter a valid countdown date and time";
  if (!event.img.startsWith("https://")) return "Upload an edition graphic";
  for (const name of ["Early Bird", "Regular", "VIP Experience"]) {
    if (!Number.isInteger(event.prices[name]) || event.prices[name] <= 0) return `Enter a valid ${name} price`;
  }
  return null;
}