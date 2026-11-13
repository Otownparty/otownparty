import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Send, AlertTriangle } from "lucide-react";

type Row = { reference: string; buyer_email: string; buyer_name: string | null; ticket_type: string; quantity: number; created_at: string; email_error: string | null; email_attempts: number };

const friendly = (e: string | null) => {
  if (!e) return "Not delivered yet";
  if (/429|limit/i.test(e)) return "Daily email limit reached";
  if (/422|invalid/i.test(e)) return "Email address rejected";
  return e.slice(0, 120);
};

const UndeliveredTicketsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [paused, setPaused] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("retry-ticket-emails", { body: { action: "list" } });
    setRows(data?.undelivered ?? []);
    setPaused(data?.pausedUntil && new Date(data.pausedUntil) > new Date() ? data.pausedUntil : null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (reference?: string) => {
    setBusy(reference ?? "all");
    const { data, error } = await supabase.functions.invoke("retry-ticket-emails", { body: { action: "send", reference } });
    setBusy(null);
    if (error || data?.error) toast.error(data?.error || "Couldn't resend right now");
    else if (data.limited) toast.error(`Sent ${data.sent}. Email limit reached — the rest will retry automatically.`);
    else toast.success(`Sent ${data.sent} ticket email${data.sent === 1 ? "" : "s"}`);
    load();
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><AlertTriangle className="h-4 w-4 text-primary" /> Undelivered tickets ({rows.length})</h3>
          <p className="text-xs text-muted-foreground">Paid buyers whose ticket email didn't go through. These retry automatically; same QR codes are sent.</p>
        </div>
        <Button size="icon" variant="ghost" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {paused && <p className="mb-3 rounded-lg bg-muted p-2 text-xs">Email limit reached. Automatic retries resume after {new Date(paused).toLocaleTimeString()}.</p>}
      {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">All ticket emails delivered 🎉</p>
      ) : (
        <>
          <Button className="mb-3 w-full" disabled={!!busy} onClick={() => send()}>
            {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Resend all (up to 15 at a time)
          </Button>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.reference} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.buyer_email}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.quantity} × {r.ticket_type} · {friendly(r.email_error)}{r.email_attempts ? ` · ${r.email_attempts} tries` : ""}</p>
                </div>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => send(r.reference)}>
                  {busy === r.reference ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend"}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
export default UndeliveredTicketsPanel;
