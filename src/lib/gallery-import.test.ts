import { describe, expect, it } from "vitest";
import { galleryImportFinished } from "./gallery-import";

describe("Gallery import completion", () => {
  it("stops on a blocked source instead of retrying indefinitely", () => {
    expect(galleryImportFinished({ status: "failed", error: "Photographer site returned 403" })).toBe(true);
  });
  it("continues while photos are being discovered or saved", () => {
    expect(galleryImportFinished({ status: "discovering" })).toBe(false);
    expect(galleryImportFinished({ status: "importing" })).toBe(false);
  });
  it("stops when ready or already published", () => {
    expect(galleryImportFinished({ status: "ready" })).toBe(true);
    expect(galleryImportFinished({ status: "published" })).toBe(true);
  });
});