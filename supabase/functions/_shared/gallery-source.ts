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
export async function discoverPhotos(link: string): Promise<string[]> {
  const response = await fetch(validateGalleryLink(link), { redirect: "manual" });
  if (!response.ok) throw new Error(`Photographer site returned ${response.status}. Ask the photographer for an unrestricted public gallery link.`);
  const html = await response.text();
  if (/Just a moment|cf-chl-|challenge-platform|Access Denied/i.test(html)) throw new Error("This photographer site blocks automatic importing. Ask for a public downloadable gallery.");
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