import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { combineGalleryPhotos, type GalleryPhoto } from "@/lib/gallery";

export function useGalleryPhotos(initial: GalleryPhoto[]) {
  const [photos, setPhotos] = useState(initial);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [{ data: state, error }, { data: albums, error: albumError }] = await Promise.all([
        supabase.from("gallery_state").select("latest_import_id").eq("id", true).maybeSingle(),
        supabase.from("gallery_imports").select("id,edition_num").eq("status", "published"),
      ]);
      if (error || albumError || !alive || !state?.latest_import_id) return;
      const editionOf = new Map((albums ?? []).map(a => [a.id, a.edition_num]));
      const imported: (GalleryPhoto & { editionNum: number })[] = [];
      for (let start = 0; ; start += 1000) {
        const { data, error: photoError } = await supabase.from("gallery_photos").select("storage_path,alt,import_id,position").in("import_id", (albums ?? []).map(a => a.id)).order("import_id").order("position").range(start, start + 999);
        if (photoError || !alive) return;
        for (const p of data ?? []) if (p.storage_path) imported.push({ src: supabase.storage.from("gallery-photos").getPublicUrl(p.storage_path).data.publicUrl, alt: p.alt, editionNum: editionOf.get(p.import_id) ?? 0, era: "" });
        if ((data?.length ?? 0) < 1000) break;
      }
      if (alive) setPhotos(combineGalleryPhotos(initial, imported, editionOf.get(state.latest_import_id) ?? null));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [initial]);
  return photos;
}