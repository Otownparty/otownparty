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
export async function discoverPhotos(link: string): Promise<string[]> {
  const gallery = new URL(validateGalleryLink(link));
  if (/pixsilos\.com$/.test(gallery.hostname)) return discoverPixsilos(gallery);
  const response = await fetch(gallery.href, { redirect: "manual", headers: UA });
  if (!response.ok) throw new Error(`Photographer site returned ${response.status}. Ask the photographer for an unrestricted public gallery link.`);
  const html = await response.text();
  if (/<title>\s*Just a moment|cf-chl-|<title>\s*Access Denied/i.test(html)) throw new Error("This photographer site blocks automatic importing. Ask for a public downloadable gallery.");
  const decoded = html.replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\u0026|&amp;/g, "&");
  const urls = [...decoded.matchAll(/https:\/\/(?:media\.pixsilos\.com|(?:[a-z0-9-]+\.)*pixieset\.com)\/[^\s"'<>\\]+/gi)].map(m => m[0]).filter(url => /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url));
  const map = new Map<string, string>();
  for (const url of urls) {
    const safe = validatePhotoLink(url);
    const key = new URL(safe).pathname.replace(/-(?:small|medium|large|xlarge|xxlarge|original)\./i, ".").replace(/\/images\/(?:small|medium|large)\//, "/images/");
    const old = map.get(key);
    if (!old || /xlarge|original|\/large\//i.test(safe)) map.set(key, safe);
  }
  const totalMatch = decoded.match(/"(?:imageCount|image_count|total_photos|photo_count)"\s*:\s*(\d+)/i);
  const expected = totalMatch ? Number(totalMatch[1]) : null;
  if (map.size === 0 || expected === null || map.size < expected) throw new Error(`Could not verify the complete photo collection${expected ? ` (${map.size} of ${expected} accessible)` : ""}. Nothing was published. Ask the photographer for a public link with all photos accessible.`);
  return [...map.values()];
}