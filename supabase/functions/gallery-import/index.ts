import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { discoverPhotos, validateGalleryLink, validatePhotoLink } from "../_shared/gallery-source.ts";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), edition: z.string().min(1).max(200), editionNum: z.number().int().positive(), title: z.string().min(1).max(200), links: z.array(z.string().url().max(2000)).min(1).max(20) }),
  z.object({ action: z.literal("step"), id: z.string().uuid() }),
]);
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Gallery importing is not configured" }, 500);
    const db = createClient(url, key);
    const { data: user } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }).auth.getUser();
    if (!user.user) return json({ error: "Please sign in" }, 401);
    const { data: admin } = await db.rpc("has_role", { _user_id: user.user.id, _role: "admin" });
    if (!admin) return json({ error: "Admin access required" }, 403);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Check the edition and photographer links" }, 400);
    const body = parsed.data;
    if (body.action === "start") {
      let links: string[];
      try { links = [...new Set(body.links.map(validateGalleryLink))]; } catch (error) { return json({ error: (error as Error).message }, 400); }
      const { data: job, error } = await db.from("gallery_imports").insert({ edition: body.edition, edition_num: body.editionNum, title: body.title, links: links.map(url => ({ url, status: "pending", count: 0 })), created_by: user.user.id }).select().single();
      if (error) throw error;
      return json({ id: job.id });
    }
    const { data: job, error: jobError } = await db.from("gallery_imports").select().eq("id", body.id).single();
    if (jobError) throw jobError;
    if (job.status === "published" || job.status === "ready") return json({ status: job.status });
    if (job.status === "failed") return json({ error: job.error || "A photographer link could not be imported", status: "failed" });
    const links = job.links as { url: string; status: string; count: number; error?: string }[];
    const pending = links.find(link => link.status === "pending");
    if (pending) {
      try {
        const photos = await discoverPhotos(pending.url);
        const base = links.reduce((sum, l) => sum + l.count, 0);
        for (let i = 0; i < photos.length; i += 200) {
          const { error } = await db.from("gallery_photos").upsert(photos.slice(i, i + 200).map((source_url, index) => ({ import_id: job.id, source_url, alt: `${job.title} · Photo ${base + i + index + 1}`, position: base + i + index })), { onConflict: "import_id,source_url", ignoreDuplicates: true });
          if (error) throw error;
        }
        pending.status = "discovered"; pending.count = photos.length;
        const { error } = await db.from("gallery_imports").update({ links, status: links.some(l => l.status === "pending") ? "discovering" : "importing", error: null }).eq("id", job.id);
        if (error) throw error;
        return json({ status: "discovering" });
      } catch (error) {
        pending.status = "failed"; pending.error = (error as Error).message;
        await db.from("gallery_imports").update({ links, status: "failed", error: pending.error }).eq("id", job.id);
        return json({ error: pending.error, status: "failed" });
      }
    }
    if (links.some(l => l.status === "failed")) return json({ error: job.error || "A photographer link could not be imported", status: "failed" });
    const { data: pendingPhotos, error: readError } = await db.from("gallery_photos").select().eq("import_id", job.id).is("storage_path", null).order("position").limit(24);
    if (readError) throw readError;
    const failures = await Promise.all((pendingPhotos ?? []).map(async photo => {
      try {
        const response = await fetch(validatePhotoLink(photo.source_url), { redirect: "manual" });
        if (!response.ok) throw new Error(`Photo download returned ${response.status}`);
        const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
        if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error("The photographer returned a non-image file");
        if (Number(response.headers.get("content-length")) > 20 * 1024 * 1024) throw new Error("Photo exceeds 20 MB");
        const blob = await response.blob();
        if (blob.size > 20 * 1024 * 1024) throw new Error("Photo exceeds 20 MB");
        const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
        const path = `${job.id}/${photo.id}.${ext}`;
        const { error: uploadError } = await db.storage.from("gallery-photos").upload(path, blob, { contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { error } = await db.from("gallery_photos").update({ storage_path: path, error: null }).eq("id", photo.id);
        if (error) throw error;
        return null;
      } catch (error) {
        await db.from("gallery_photos").update({ error: (error as Error).message }).eq("id", photo.id);
        return (error as Error).message;
      }
    }));
    const failed = failures.find(Boolean);
    if (failed) {
      await db.from("gallery_imports").update({ status: "failed", error: failed }).eq("id", job.id);
      return json({ error: failed, status: "failed" });
    }
    const { count, error: countError } = await db.from("gallery_photos").select("id", { count: "exact", head: true }).eq("import_id", job.id).is("storage_path", null);
    if (countError) throw countError;
    const status = count === 0 ? "ready" : "importing";
    await db.from("gallery_imports").update({ status, error: null }).eq("id", job.id);
    return json({ status, remaining: count });
  } catch (error) { return json({ error: (error as Error).message }, 500); }
});