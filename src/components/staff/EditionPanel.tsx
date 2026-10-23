import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Check, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useEventEdition } from "@/hooks/useEventEdition";
import { validateEvent, type EventDetails } from "@/lib/eventEdition";
import { toast } from "sonner";

export default function EditionPanel() {
  const { event, refresh } = useEventEdition();
  const [draft, setDraft] = useState<EventDetails>({ ...event, prices: { ...event.prices } });
  const [busy, setBusy] = useState("");
  const [warning, setWarning] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!uploaded) setDraft({ ...event, prices: { ...event.prices } }); }, [event]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: keyof EventDetails, value: string | number | boolean) => setDraft(d => ({ ...d, [key]: value }));
  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return toast.error("Choose a JPG, PNG or WebP image under 10 MB");
    setBusy("Reading graphic…"); setWarning("");
    try {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("edition-graphics").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: image } = supabase.storage.from("edition-graphics").getPublicUrl(path);
      setDraft(d => ({ ...d, num: event.num + 1, title: "", date: "", shortDate: "", time: "", venue: "", startsAt: "", desc: "", contacts: "", img: image.publicUrl })); setUploaded(true);
      const { data, error: readError } = await supabase.functions.invoke("extract-edition", { body: { path } });
      if (readError) {
        const response = readError.context;
        const result = response instanceof Response ? await response.json().catch(() => null) : null;
        throw new Error(result?.error || "Could not read the graphic; enter the details below");
      }
      if (!data?.details) throw new Error("No event details found; enter them below");
      const x = data.details;
      setDraft(d => ({ ...d, num: x.num ?? event.num + 1, title: x.title ?? "", date: x.date ?? "", shortDate: x.date ?? "", time: x.time ?? "", venue: x.venue ?? "", desc: x.description ?? "", contacts: x.contacts ?? "", startsAt: x.startLocal ? new Date(`${x.startLocal}:00+01:00`).toISOString() : "", prices: { "Early Bird": x.earlyBird ?? d.prices["Early Bird"], Regular: x.regular ?? d.prices.Regular, "VIP Experience": x.vip ?? d.prices["VIP Experience"] } }));
      setWarning([x.warnings, [x.earlyBird, x.regular, x.vip].some(p => p == null) ? "Unprinted ticket prices are unchanged. Confirm every price before publishing." : ""].filter(Boolean).join(" "));
      toast.success("Graphic read — review the details");
    } catch (error) { setWarning((error as Error).message); toast.error((error as Error).message); }
    finally { setBusy(""); if (input.current) input.current.value = ""; }
  };
  const publish = async () => {
    const invalid = validateEvent(draft);
    if (invalid) return toast.error(invalid);
    if (!uploaded && draft.num !== event.num) return toast.error("Upload the next edition graphic first");
    if (Date.parse(draft.startsAt) <= Date.now()) return toast.error("Countdown start must be in the future");
    setBusy("Publishing edition…");
    try {
      const { error } = await supabase.rpc("publish_event_edition", { p_details: JSON.parse(JSON.stringify(draft)) });
      if (error) throw error;
      await refresh(); setUploaded(false); toast.success("Edition published across the website");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(""); }
  };
  const localDate = draft.startsAt && Number.isFinite(Date.parse(draft.startsAt)) ? new Date(Date.parse(draft.startsAt) + 3600000).toISOString().slice(0, 16) : "";
  return <section className="max-w-4xl mx-auto space-y-6">
    <div><p className="text-xs uppercase text-primary font-semibold mb-2">Next edition</p><h2 className="font-display text-2xl font-bold">Edition graphic</h2></div>
    <input ref={input} aria-label="Edition graphic" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => void upload(e.target.files?.[0])} />
    <Button variant="outline" onClick={() => input.current?.click()} disabled={!!busy}><Upload size={16} className="mr-2" />Upload graphic</Button>
    {busy && <p role="status" className="flex items-center gap-2 text-primary"><Loader2 size={16} className="animate-spin" />{busy}</p>}
    {warning && <p role="alert" className="text-sm text-primary border-l-2 border-primary pl-3">{warning}</p>}
    <div className="grid md:grid-cols-[240px_1fr] gap-8">
      <div className="w-full max-w-60 aspect-[4/5] bg-muted overflow-hidden rounded-lg">{draft.img ? <img src={draft.img} alt="Edition graphic preview" className="w-full h-full object-contain" /> : <ImagePlus className="m-auto" />}</div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label htmlFor="edition-num">Edition number</Label><Input id="edition-num" type="number" min={1} value={draft.num} onChange={e => set("num", Number(e.target.value))} /></div>
        <div><Label htmlFor="edition-title">Edition name</Label><Input id="edition-title" value={draft.title} onChange={e => set("title", e.target.value)} /></div>
        <div><Label htmlFor="edition-date">Display date</Label><Input id="edition-date" value={draft.date} onChange={e => { set("date", e.target.value); set("shortDate", e.target.value); }} /></div>
        <div><Label htmlFor="edition-time">Event hours</Label><Input id="edition-time" value={draft.time} onChange={e => set("time", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="edition-start">Countdown start (Nigeria time)</Label><Input id="edition-start" type="datetime-local" value={localDate} onChange={e => set("startsAt", e.target.value ? new Date(`${e.target.value}:00+01:00`).toISOString() : "")} /></div>
        <div className="sm:col-span-2"><Label htmlFor="edition-venue">Venue</Label><Input id="edition-venue" value={draft.venue} onChange={e => set("venue", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="edition-description">Description</Label><Textarea id="edition-description" value={draft.desc} onChange={e => set("desc", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="edition-contacts">Enquiries</Label><Input id="edition-contacts" value={draft.contacts} onChange={e => set("contacts", e.target.value)} /></div>
        {Object.entries(draft.prices).map(([name, price]) => <div key={name}><Label htmlFor={`price-${name}`}>{name} (₦)</Label><Input id={`price-${name}`} type="number" min={1} step={1} value={price} onChange={e => setDraft(d => ({ ...d, prices: { ...d.prices, [name]: Number(e.target.value) } }))} /></div>)}
        <div className="flex items-center gap-3"><Switch id="edition-sales" checked={draft.salesOpen} onCheckedChange={v => set("salesOpen", v)} /><Label htmlFor="edition-sales">Online ticket sales</Label></div>
      </div>
    </div>
    <Button onClick={() => void publish()} disabled={!!busy}><Check size={16} className="mr-2" />Confirm & publish edition</Button>
  </section>;
}