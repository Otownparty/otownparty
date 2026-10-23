import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Images, Loader2, Plus, Trash2, Upload, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEventEdition } from "@/hooks/useEventEdition";
import { toast } from "sonner";
import { galleryImportFinished, type GalleryImportResult } from "@/lib/gallery-import";

type Job = { id: string; title: string; edition_num: number; status: string; error: string | null; links: unknown };
export default function GalleryUpdate() {
  const navigate = useNavigate();
  const { event, editions } = useEventEdition();
  const options = [event, ...editions];
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState(String(event.num));
  const [links, setLinks] = useState([""]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState("");
  const [counts, setCounts] = useState<Record<string, { total: number; done: number }>>({});
  const pause = useRef(false);
  const [error, setError] = useState("");
  const load = async () => {
    const { data, error } = await supabase.from("gallery_imports").select("id,title,edition_num,status,error,links").order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    setJobs(data ?? []);
    const results = await Promise.all((data ?? []).map(async j => {
      const [total, done] = await Promise.all([
        supabase.from("gallery_photos").select("id", { head: true, count: "exact" }).eq("import_id", j.id),
        supabase.from("gallery_photos").select("id", { head: true, count: "exact" }).eq("import_id", j.id).not("storage_path", "is", null),
      ]);
      return [j.id, { total: total.count ?? 0, done: done.count ?? 0 }] as const;
    }));
    setCounts(Object.fromEntries(results));
  };
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (!data.session) return navigate("/staff?next=/staff/gallery", { replace: true });
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
      if (!alive) return;
      if (error || !roles?.some(r => r.role === "admin")) return navigate("/scan", { replace: true });
      setAuthorized(true);
      await load();
    };
    void check().catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; pause.current = true; };
  }, [navigate]);
  const invoke = async (body: unknown) => {
    const { data, error } = await supabase.functions.invoke("gallery-import", { body });
    if (error) {
      const details = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
      throw new Error(details?.error || error.message);
    }
    if (data?.error && data.status !== "failed") throw new Error(data.error);
    return data as GalleryImportResult;
  };
  const run = async (id: string) => {
    pause.current = false; setBusy(id); setError("");
    try {
      while (!pause.current) {
        const result = await invoke({ action: "step", id });
        if (result.status === "failed") setError(result.error || "The photographer link could not be imported. Your current gallery has not changed.");
        await load();
        if (galleryImportFinished(result)) break;
      }
    } catch (e) { setError((e as Error).message); await load().catch(() => {}); }
    finally { setBusy(""); }
  };
  const start = async () => {
    const edition = options.find(e => String(e.num) === selected);
    if (!edition) return;
    const urls = links.map(l => l.trim()).filter(Boolean);
    if (!urls.length) return toast.error("Add at least one photographer link");
    setBusy("start"); setError("");
    try {
      const result = await invoke({ action: "start", edition: `Otown Party ${edition.num}.0 - ${edition.title}`, editionNum: edition.num, title: edition.title, links: urls });
      if (!result.id) throw new Error(result.error || "Could not start the import. Please try again.");
      await run(result.id);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  };
  const publish = async (id: string) => {
    setBusy(id); setError("");
    try {
      const { error } = await supabase.rpc("publish_gallery_import", { p_id: id });
      if (error) throw error;
      await load(); toast.success("Last Edition updated; previous photos remain in All Editions");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  };
  if (!authorized) return <main className="min-h-screen flex items-center justify-center bg-background px-4">{checking ? <Loader2 className="animate-spin text-primary" aria-label="Loading" size={32} /> : <div className="max-w-md space-y-4"><h1 className="font-display text-2xl font-bold">Gallery update</h1><p role="alert" className="text-primary break-words">{error || "Please sign in as an admin to update the gallery."}</p><Button asChild variant="outline"><Link to="/staff?next=/staff/gallery">Staff sign-in</Link></Button></div>}</main>;
  return <main className="min-h-screen bg-background px-4 py-10">
    <div className="max-w-3xl mx-auto">
      <Button asChild variant="ghost" className="mb-6 text-muted-foreground hover:text-primary"><Link to="/staff"><ArrowLeft size={16} className="mr-2" />Staff Dashboard</Link></Button>
      <h1 className="font-display text-3xl font-bold mb-8">Gallery update</h1>
      <div className="space-y-6">
        <div><Label htmlFor="gallery-edition">Edition</Label><Select value={selected} onValueChange={setSelected} disabled={!!busy}><SelectTrigger id="gallery-edition" className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{options.map(e => <SelectItem key={e.num} value={String(e.num)}>Otown Party {e.num}.0 · {e.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-4">{links.map((link, i) => <div key={i}><Label htmlFor={`photographer-${i}`}>Photographer {i + 1}</Label><div className="flex gap-2 mt-2"><Input id={`photographer-${i}`} type="url" placeholder="https://photographer.pixieset.com/edition/" value={link} disabled={!!busy} onChange={e => setLinks(old => old.map((l, j) => j === i ? e.target.value : l))} /><Button variant="ghost" size="icon" title="Remove link" aria-label={`Remove photographer ${i + 1}`} disabled={!!busy || links.length === 1} onClick={() => setLinks(old => old.filter((_, j) => j !== i))}><Trash2 size={16} /></Button></div></div>)}</div>
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!!busy || links.length >= 20} onClick={() => setLinks(old => [...old, ""])}><Plus size={16} className="mr-2" />Add photographer</Button><Button disabled={!!busy} onClick={() => void start()}><Images size={16} className="mr-2" />Fetch photos</Button>{busy && <Button variant="outline" onClick={() => { pause.current = true; }}><Pause size={16} className="mr-2" />Pause</Button>}</div>
        {busy && <p role="status" className="text-primary text-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Importing photos…</p>}
        {error && <div role="alert" className="border-l-2 border-primary pl-3 text-sm text-primary break-words space-y-2"><p>{error}</p><p className="text-muted-foreground">Your current gallery has not changed. If access is blocked, ask the photographer to allow automatic downloads, then paste the accessible link and fetch again.</p></div>}
      </div>
      <section className="mt-12 border-t border-border pt-8"><h2 className="font-display text-xl font-bold mb-6">Imports</h2>
        {!jobs.length && <p className="text-muted-foreground text-sm">No imports yet.</p>}
        <div className="space-y-6">{jobs.map(job => <div key={job.id} className="border-b border-border pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Otown Party {job.edition_num}.0 · {job.title}</h3><span className="text-xs uppercase text-primary">{job.status}</span></div>
          <p className="text-sm text-muted-foreground">{counts[job.id]?.done ?? 0} / {counts[job.id]?.total ?? 0} photos saved</p>
          {job.error && <p className="text-sm text-primary break-words">{job.error}</p>}
          {job.status === "ready" && <Button disabled={!!busy} onClick={() => void publish(job.id)}><Upload size={16} className="mr-2" />Publish Last Edition</Button>}
          {["discovering", "importing"].includes(job.status) && <Button variant="outline" disabled={!!busy} onClick={() => void run(job.id)}>Resume import</Button>}
          {job.status === "published" && <Button asChild variant="outline"><Link to="/gallery">View gallery<ArrowLeft size={16} className="ml-2 rotate-180" /></Link></Button>}
        </div>)}</div>
      </section>
    </div>
  </main>;
}