import { describe, expect, it } from "vitest";
import { vendorsForEdition } from "./vendor-edition";

const oldEdition = "Otown Party 14.0 - Ede Edition";
const newEdition = "Otown Party 15.0 - Afro All Black Edition";
const vendors = [
  { id: "old", edition: oldEdition, status: "paid" },
  { id: "new", edition: newEdition, status: "paid" },
  { id: "unknown", edition: null, status: "paid" },
];
describe("Separate vendor lists for each edition", () => {
  it("includes only new-edition vendors in the new edition", () => {
    expect(vendorsForEdition(vendors, newEdition).map(v => v.id)).toEqual(["new"]);
  });
  it("preserves previous vendors only in their original edition", () => {
    expect(vendorsForEdition(vendors, oldEdition).map(v => v.id)).toEqual(["old"]);
  });
  it("starts a later edition with an empty vendor list", () => {
    expect(vendorsForEdition(vendors, "Otown Party 16.0 - Next Edition")).toEqual([]);
  });
});