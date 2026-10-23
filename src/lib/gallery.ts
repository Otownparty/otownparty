export const galleryFilters = [{ label: "Last Edition", value: "last" }, { label: "All Editions", value: "all" }] as const;
export const defaultGalleryFilter = "last";
export type GalleryPhoto = { src: string; alt: string; era: string };
export function combineGalleryPhotos(initial: GalleryPhoto[], imported: (GalleryPhoto & { importId: string })[], latestId: string | null, latestEdition: number | null) {
  const baseline = initial.map(p => ({ ...p, era: latestId && latestEdition !== 14 ? "archive" : p.era }));
  const seen = new Set(baseline.map(p => p.src));
  return [...baseline, ...imported.filter(p => { if (seen.has(p.src)) return false; seen.add(p.src); return true; }).map(p => ({ src: p.src, alt: p.alt, era: p.importId === latestId ? "last" : "archive" }))];
}