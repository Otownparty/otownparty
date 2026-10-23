import { describe, expect, it } from "vitest";
import { editionKey, validateEvent, type EventDetails } from "./eventEdition";
const event: EventDetails = { num: 16, title: "Next Edition", date: "December 19, 2026", shortDate: "December 19, 2026", time: "6PM–4AM", venue: "Event venue", startsAt: "2026-12-19T17:00:00Z", img: "https://example.com/flyer.jpg", desc: "", contacts: "", prices: { "Early Bird": 4000, Regular: 5000, "VIP Experience": 15000 }, salesOpen: true };
describe("Edition publishing", () => {
  it("uses the uploaded edition for new event identity", () => expect(editionKey(event)).toBe("Otown Party 16.0 - Next Edition"));
  it("requires a valid countdown date", () => expect(validateEvent({ ...event, startsAt: "" })).toBe("Enter a valid countdown date and time"));
  it("rejects invalid ticket prices", () => expect(validateEvent({ ...event, prices: { ...event.prices, Regular: 0 } })).toBe("Enter a valid Regular price"));
  it("requires an uploaded graphic", () => expect(validateEvent({ ...event, img: "" })).toBe("Upload an edition graphic"));
  it("accepts complete event details", () => expect(validateEvent(event)).toBeNull());
});