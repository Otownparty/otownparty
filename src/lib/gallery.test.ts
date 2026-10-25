import { describe, expect, it } from "vitest";
import { combineGalleryPhotos, defaultGalleryFilter, galleryFilters } from "./gallery";
describe("Gallery edition rules", () => {
  it("opens Last Edition first by default", () => {
    expect(defaultGalleryFilter).toBe("last");
    expect(galleryFilters[0].value).toBe("last");
    expect(galleryFilters[1].value).toBe("all");
  });
  it("archives previous photos and retains them when a new edition is published", () => {
    const result = combineGalleryPhotos([{ src: "ede.jpg", alt: "Ede", era: "last" }], [{ src: "new.jpg", alt: "New", era: "", editionNum: 15 }, { src: "old.jpg", alt: "Old", era: "", editionNum: 13 }], 15);
    expect(result.find(p => p.src === "ede.jpg")?.era).toBe("archive");
    expect(result.find(p => p.src === "old.jpg")?.era).toBe("archive");
    expect(result.filter(p => p.era === "last").map(p => p.src)).toEqual(["new.jpg"]);
    expect(result).toHaveLength(3);
  });
  it("adds a second photographer's album for the same edition to Last Edition instead of replacing the first", () => {
    const result = combineGalleryPhotos([], [{ src: "dandy.jpg", alt: "A", era: "", editionNum: 15 }, { src: "sdm.jpg", alt: "B", era: "", editionNum: 15 }], 15);
    expect(result.filter(p => p.era === "last").map(p => p.src)).toEqual(["dandy.jpg", "sdm.jpg"]);
  });
  it("keeps existing Ede photos when adding another photographer to that same edition", () => {
    expect(combineGalleryPhotos([{ src: "ede.jpg", alt: "Ede", era: "last" }], [], 14)[0].era).toBe("last");
  });
});
