import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock, Sparkles } from "lucide-react";

const db = supabase as any;

// Keep this in sync with the ticket names in src/pages/Tickets.tsx
const TICKET_NAMES = ["Early Bird", "Regular", "VIP Experience"];

const TicketLockPanel = () => {
  const [loading, setLoading] = useState(true);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [savingLock, setSavingLock] = useState<string | null>(null);

  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: lockRows, error: lErr }, { data: bannerRow, error: bErr }] = await Promise.all([
      db.from("ticket_locks").select("ticket_name, locked"),
      db.from("ticket_banner").select("enabled, message").eq("id", true).maybeSingle(),
    ]);
    if (lErr) toast.error("Couldn't load ticket locks");
    if (bErr) toast.error("Couldn't load banner");

    const map: Record<string, boolean> = {};
    TICKET_NAMES.forEach((n) => { map[n] = false; });
    (lockRows ?? []).forEach((r: any) => { map[r.ticket_name] = r.locked; });
    setLocks(map);

    if (bannerRow) {
      setBannerEnabled(!!bannerRow.enabled);
      setBannerMessage(bannerRow.message ?? "");
    }
    setLoading(false);
  };

  const toggleLock = async (name: string, next: boolean) => {
    setSavingLock(name);
    const { error } = await db
      .from("ticket_locks")
      .upsert({ ticket_name: name, locked: next }, { onConflict: "ticket_name" });
    setSavingLock(null);
    if (error) return toast.error(error.message);
    setLocks((l) => ({ ...l, [name]: next }));
    toast.success(`${name} ${next ? "locked" : "unlocked"}`);
  };

  const saveBanner = async () => {
    setSavingBanner(true);
    const { error } = await db
      .from("ticket_banner")
      .upsert({ id: true, enabled: bannerEnabled, message: bannerMessage.trim() }, { onConflict: "id" });
    setSavingBanner(false);
    if (error) return toast.error(error.message);
    toast.success("Banner saved");
  };

  const lockAll = async () => {
    setLoading(true);
    const rows = TICKET_NAMES.map((name) => ({ ticket_name: name, locked: true }));
    const { error } = await db.from("ticket_locks").upsert(rows, { onConflict: "ticket_name" });
    if (error) toast.error(error.message);
    await load();
  };

  const unlockAll = async () => {
    setLoading(true);
    const rows = TICKET_NAMES.map((name) => ({ ticket_name: name, locked: false }));
    const { error } = await db.from("ticket_locks").upsert(rows, { onConflict: "ticket_name" });
    if (error) toast.error(error.message);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Per-ticket locks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg">Ticket Locks</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={lockAll}>
              <Lock size={13} className="mr-1" /> Lock all
            </Button>
            <Button size="sm" variant="ghost" onClick={unlockAll}>
              Unlock all
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
          {TICKET_NAMES.map((name) => (
            <div key={name} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {locks[name] ? "Locked — can't be purchased" : "Open for purchase"}
                </p>
              </div>
              <Switch
                checked={!!locks[name]}
                disabled={savingLock === name}
                onCheckedChange={(v) => toggleLock(name, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div>
        <h3 className="font-display text-lg mb-3">Tickets Page Banner</h3>
        <div className="border border-border rounded-xl bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show banner</p>
              <p className="text-xs text-muted-foreground">
                Appears at the top of the tickets page, above the ticket cards.
              </p>
            </div>
            <Switch checked={bannerEnabled} onCheckedChange={setBannerEnabled} />
          </div>
          <Textarea
            placeholder="e.g. Online sales are closed — tickets available at the gate only!"
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            rows={3}
          />

          {bannerEnabled && bannerMessage.trim() && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Live preview:</p>
              <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-pink-400/10 to-sky-400/5 p-5 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/40 border border-primary/30 backdrop-blur-sm mb-3">
                  <Sparkles size={12} className="text-primary" />
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.25em]">Tonight We Rave</p>
                </div>
                <p className="text-sm text-foreground font-medium whitespace-pre-line">{bannerMessage}</p>
              </div>
            </div>
          )}

          <Button onClick={saveBanner} disabled={savingBanner} className="w-full">
            {savingBanner ? <Loader2 className="animate-spin" size={16} /> : "Save banner"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketLockPanel;
