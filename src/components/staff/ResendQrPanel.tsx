import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";

type Result = { reference: string; ok: boolean; count: number; error?: string };
type Suggestion = { email: string; tickets: number; reference?: string; edition?: string };
type Entry = { email: string; from?: string; results?: Result[]; error?: string; suggestions?: Suggestion[] };

const ResendQrPanel = () => {
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);

  const run = async (emails: string[], ref: string, lookup: string) => {
    setSending(true);
    for (const addr of emails) {
      const body: Record<string, string> = { email: addr, scope };
      if (ref) body.reference = ref;
      if (lookup) body.lookupEmail = lookup;
      const { data, error } = await supabase.functions.invoke("resend-ticket-email", { body });
      const entry: Entry = { email: addr, from: ref || lookup || undefined };
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = (await error.context.json()).error || msg; } catch { /* keep */ }
        }
        entry.error = msg;
      } else if (data?.error) {
        entry.error = data.error;
        entry.suggestions = data.suggestions ?? [];
      } else entry.results = data?.results ?? [];
      setLog((l) => [entry, ...l]);
    }
    setSending(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = email.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!emails.length) return toast.error("Enter the email to send tickets to");
    const ref = reference.trim();
    const lookup = lookupEmail.trim();
    if ((ref || lookup) && emails.length > 1) return toast.error("Use one email when sending by reference or paying email");
    await run(emails, ref, lookup);
    setEmail(""); setReference(""); setLookupEmail("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="font-display text-lg mb-1">Resend Ticket QR Codes</h3>
        <p className="text-sm text-muted-foreground">
          Find an order by its reference ID or the email used when paying, and send the same QR codes to any email.
          If the buyer typed the wrong email, put it in the second box and the correct one in "Send tickets to".
        </p>
      </div>

      <form onSubmit={send} className="border border-border rounded-xl bg-card p-4 space-y-4">
        <Input
          aria-label="Payment reference ID"
          placeholder="Payment reference ID (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input
          aria-label="Email used when paying"
          placeholder="Email used when paying (optional, e.g. the wrong one)"
          value={lookupEmail}
          onChange={(e) => setLookupEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">You can paste the reference with extra words like "Reference OTP-…". The same QR codes are sent, so each ticket can still be scanned only once.</p>
        <Input
          aria-label="Send tickets to"
          placeholder="Send tickets to: correct@example.com"
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
              <p className="font-medium mb-1">To {entry.email}{entry.from && <span className="text-muted-foreground font-normal text-xs"> · found by {entry.from}</span>}</p>
              {entry.error ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-destructive"><XCircle size={14} /> {entry.error}</p>
                  {entry.suggestions?.map((sg) => (
                    <div key={sg.email} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <span className="text-xs flex-1">Did you mean <b>{sg.email}</b>? {sg.tickets} ticket{sg.tickets === 1 ? "" : "s"}{sg.edition ? ` · ${sg.edition.replace("Otown Party ", "")}` : ""}</span>
                      <Button type="button" size="sm" disabled={sending} onClick={() => run([entry.email], "", sg.email)}>Send to {entry.email}</Button>
                    </div>
                  ))}
                </div>
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
