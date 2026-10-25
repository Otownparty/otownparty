const galleryHosts = /^(?:[a-z0-9-]+\.)?pixieset\.com$|^(?:www\.)?pixsilos\.com$/;
const imageHosts = /^(?:[a-z0-9-]+\.)*pixieset\.com$|^media\.pixsilos\.com$/;
export function validateGalleryLink(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !galleryHosts.test(url.hostname)) throw new Error("Use a public Pixieset or Pixsilos gallery link");
  return url.href;
}
export function validatePhotoLink(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !imageHosts.test(url.hostname)) throw new Error("Photo host is not supported");
  return url.href;
}
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "text/html,application/json" };
async function discoverPixsilos(url: URL): Promise<string[]> {
  const slug = url.pathname.split("/").filter(Boolean).pop();
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) throw new Error("Use a Pixsilos gallery link");
  const res = await fetch(`https://api.pixsilos.com/api/galleries/g/${slug}/images`, { headers: UA });
  if (!res.ok) throw new Error(`Photographer site returned ${res.status}. Check the gallery link is public.`);
  const body = await res.json().catch(() => null);
  const media = body?.data?.media;
  const expected = Number(body?.data?.gallery?.mediaCount ?? (Array.isArray(media) ? media.length : 0));
  if (!Array.isArray(media)) throw new Error("Could not read this Pixsilos gallery");
  const photos = media.filter((m: any) => m?.type === "IMAGE" && typeof m.url === "string").map((m: any) => validatePhotoLink(m.url));
  const images = media.filter((m: any) => m?.type === "IMAGE").length;
  if (!photos.length || photos.length < images || media.length < expected) throw new Error(`Could not verify the complete photo collection (${photos.length} of ${expected} accessible). Nothing was published.`);
  return [...new Set(photos)];
}
// Pixieset's normal page sits behind a browser check, but its crawler view and photo-list feed are public.
async function discoverPixieset(url: URL): Promise<string[]> {
  const key = url.pathname.split("/").filter(Boolean)[0];
  if (!key || !/^[a-z0-9_-]+$/i.test(key)) throw new Error("Use a Pixieset gallery link like https://name.pixieset.com/gallery/");
  const page = await fetch(`${url.origin}/${key}/?_escaped_fragment_=`, { redirect: "manual" });
  if (!page.ok) throw new Error(`Photographer site returned ${page.status}. Check the gallery link is public.`);
  const html = await page.text();
  const cookie = (page.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.().map(c => c.split(";")[0]).join("; ") ?? "";
  const cid = html.match(/collectionId'\s*:\s*(\d+)/)?.[1];
  const expected = Number(html.match(/collectionPhotoCount'\s*:\s*(\d+)/)?.[1] ?? 0);
  if (!cid) throw new Error("Could not read this Pixieset gallery. Check the link opens the photos page.");
  const slugs = [...new Set([...(html.match(/allGalleries'\s*:\s*\[(.*?)\]\s*,/s)?.[1] ?? "").matchAll(/slug'\s*:\s*'([^']+)'/g)].map(m => m[1]))];
  const photos = new Set<string>();
  for (const gs of slugs.length ? slugs : ["highlights"]) {
    for (let p = 1; p <= 300; p++) {
      const res = await fetch(`${url.origin}/client/loadphotos/?cuk=${encodeURIComponent(key)}&cid=${cid}&gs=${encodeURIComponent(gs)}&fk=&page=${p}`, { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json", Cookie: cookie } });
      if (!res.ok) throw new Error(`Photographer site returned ${res.status} while listing photos.`);
      const body = await res.json().catch(() => null);
      if (body?.status !== "success") throw new Error("Could not list this Pixieset gallery's photos. Please try again.");
      const list = typeof body.content === "string" ? JSON.parse(body.content) : body.content;
      for (const item of Array.isArray(list) ? list : []) {
        const path = item?.pathXxlarge || item?.pathXlarge || item?.pathLarge;
        if (typeof path === "string") photos.add(validatePhotoLink(path.startsWith("//") ? `https:${path}` : path));
      }
      if (body.isLastPage || !list?.length) break;
    }
  }
  if (!photos.size || photos.size < expected) throw new Error(`Could not verify the complete photo collection (${photos.size} of ${expected} accessible). Nothing was published.`);
  return [...photos];
}
export async function discoverPhotos(link: string): Promise<string[]> {
  const gallery = new URL(validateGalleryLink(link));
  if (/pixsilos\.com$/.test(gallery.hostname)) return discoverPixsilos(gallery);
  return discoverPixieset(gallery);
}