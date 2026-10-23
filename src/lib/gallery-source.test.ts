import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverPhotos, validateGalleryLink, validatePhotoLink } from "../../supabase/functions/_shared/gallery-source";
afterEach(() => vi.unstubAllGlobals());
describe("Photographer import safety", () => {
  it("rejects private and unrelated destinations", () => {
    expect(() => validateGalleryLink("http://127.0.0.1/gallery")).toThrow();
    expect(() => validateGalleryLink("https://pixsilos.com.evil.example/gallery")).toThrow();
    expect(() => validatePhotoLink("https://example.com/photo.jpg")).toThrow();
  });
  it("rejects incomplete collections rather than publishing only the cover image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('"imageCount":154 "https://media.pixsilos.com/a/images/large/one.jpg"')));
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).rejects.toThrow("1 of 154");
  });
  it("returns every accessible photo from a verified complete collection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('"imageCount":2 "https://media.pixsilos.com/a/images/large/one.jpg" "https://media.pixsilos.com/a/images/large/two.jpg"')));
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).resolves.toEqual(["https://media.pixsilos.com/a/images/large/one.jpg", "https://media.pixsilos.com/a/images/large/two.jpg"]);
  });
  it("stops when the photographer denies automatic access", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).rejects.toThrow("403");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});