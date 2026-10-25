export const galleryFilters = [{ label: "Last Edition", value: "last" }, { label: "All Editions", value: "all" }] as const;
export const defaultGalleryFilter = "last";
export type GalleryPhoto = { src: string; alt: string; era: string };
// The bundled starter photos belong to edition 14 (Ede).
const BASELINE_EDITION = 14;
// Every published album from the latest edition shows in Last Edition, so extra photographers for the same edition add to it.
export function combineGalleryPhotos(initial: GalleryPhoto[], imported: (GalleryPhoto & { editionNum: number })[], latestEdition: number | null) {
  const baseline = initial.map(p => ({ ...p, era: latestEdition !== null && latestEdition !== BASELINE_EDITION ? "archive" : p.era }));
  const seen = new Set(baseline.map(p => p.src));
  return [...baseline, ...imported.filter(p => { if (seen.has(p.src)) return false; seen.add(p.src); return true; }).map(p => ({ src: p.src, alt: p.alt, era: p.editionNum === latestEdition ? "last" : "archive" }))];
}
