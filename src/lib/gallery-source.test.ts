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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: { gallery: { mediaCount: 154 }, media: [{ type: "IMAGE", url: "https://media.pixsilos.com/a/one.jpg" }] } })));
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).rejects.toThrow("1 of 154");
  });
  it("returns every accessible photo from a verified complete collection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: { gallery: { mediaCount: 2 }, media: [{ type: "IMAGE", url: "https://media.pixsilos.com/a/one.jpg" }, { type: "IMAGE", url: "https://media.pixsilos.com/a/two.jpg" }] } })));
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).resolves.toEqual(["https://media.pixsilos.com/a/one.jpg", "https://media.pixsilos.com/a/two.jpg"]);
  });
  it("reads every page of a Pixieset gallery behind its browser check", async () => {
    const page = (items: string[], last: boolean) => Response.json({ status: "success", isLastPage: last, content: JSON.stringify(items.map(n => ({ pathXxlarge: `//images.pixieset.com/1/${n}-xxlarge.jpg` }))) });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("{collectionId':99,collectionPhotoCount':3,allGalleries':[{'rank':0,slug':'highlights'}],"))
      .mockResolvedValueOnce(page(["a", "b"], false))
      .mockResolvedValueOnce(page(["c"], true)));
    await expect(discoverPhotos("https://studio.pixieset.com/allblack/")).resolves.toHaveLength(3);
  });
  it("stops when the photographer denies automatic access", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(discoverPhotos("https://pixsilos.com/photographer/gallery")).rejects.toThrow("403");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});