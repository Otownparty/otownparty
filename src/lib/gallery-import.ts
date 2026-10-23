export type GalleryImportResult = { id?: string; status?: string; error?: string };

export function galleryImportFinished(result: GalleryImportResult) {
  return ["failed", "ready", "published"].includes(result.status ?? "");
}