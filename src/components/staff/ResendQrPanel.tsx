import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";

type Result = { reference: string; ok: boolean; count: number; error?: string };
type Entry = { email: string; results?: Result[]; error?: string };

const ResendQrPanel = () => {
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = email.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!emails.length) return toast.error("Enter at least one email");
    setSending(true);
    for (const addr of emails) {
      const { data, error } = await supabase.functions.invoke("resend-ticket-email", { body: { email: addr, scope } });
      let entry: Entry = { email: addr };
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = (await error.context.json()).error || msg; } catch { /* keep */ }
        }
        entry.error = msg;
      } else entry.results = data?.results ?? [];
      setLog((l) => [entry, ...l]);
    }
    setSending(false);
    setEmail("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="font-display text-lg mb-1">Resend Ticket QR Codes</h3>
        <p className="text-sm text-muted-foreground">
          Type the email a buyer used when paying. Their QR codes are sent again from the same address as normal ticket emails.
          You can paste several emails separated by commas.
        </p>
      </div>

      <form onSubmit={send} className="border border-border rounded-xl bg-card p-4 space-y-4">
        <Input
          placeholder="buyer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex gap-2">
          {(["current", "all"] as const).map((s) => (
            <Button key={s} type="button" size="sm" variant={scope === s ? "default" : "outline"} onClick={() => setScope(s)}>
              {s === "current" ? "This edition" : "All editions"}
            </Button>
          ))}
        </div>
        <Button type="submit" disabled={sending} className="w-full">
          {sending ? <Loader2 className="animate-spin" size={16} /> : <><Mail size={16} className="mr-2" /> Send QR codes</>}
        </Button>
      </form>

      {log.length > 0 && (
        <div className="space-y-2">
          {log.map((entry, i) => (
            <div key={i} className="border border-border rounded-lg bg-card p-3 text-sm">
              <p className="font-medium mb-1">{entry.email}</p>
              {entry.error ? (
                <p className="flex items-center gap-1.5 text-destructive"><XCircle size={14} /> {entry.error}</p>
              ) : (
                entry.results!.map((r) => (
                  <p key={r.reference} className={`flex items-center gap-1.5 ${r.ok ? "text-primary" : "text-destructive"}`}>
                    {r.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {r.ok ? `Sent ${r.count || ""} ticket${r.count === 1 ? "" : "s"}`.replace("  ", " ") : r.error}
                    <span className="text-muted-foreground text-xs ml-auto truncate">{r.reference}</span>
                  </p>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResendQrPanel;
