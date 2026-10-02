import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, LogOut, Search, Copy, Download } from "lucide-react";

const db = supabase as any;

type Source = "ticket" | "fap";

type Row = {
  email: string;
  name: string | null;
  sources: Source[];
};

const FILTERS: { value: "all" | Source; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ticket", label: "Ticket buyers" },
  { value: "fap", label: "Find a Partner" },
];

const sourceLabel: Record<Source, string> = {
  ticket: "Ticket",
  fap: "FAP",
};

const Emails = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | Source>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/staff?next=/staff/emails", { replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        navigate("/scan", { replace: true });
        return;
      }
      setAuthChecked(true);
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: intents, error: iErr }, { data: locks, error: lErr }] = await Promise.all([
        db.from("payment_intents")
          .select("buyer_name, buyer_email")
          .eq("status", "claimed"),
        db.from("partner_device_locks").select("email"),
      ]);
      if (iErr) throw iErr;
      if (lErr) throw lErr;

      const map = new Map<string, Row>();

      (intents ?? []).forEach((i: any) => {
        const email = (i.buyer_email || "").trim().toLowerCase();
        if (!email) return;
        const existing = map.get(email);
        if (existing) {
          if (!existing.sources.includes("ticket")) existing.sources.push("ticket");
          if (!existing.name && i.buyer_name) existing.name = i.buyer_name;
        } else {
          map.set(email, { email, name: i.buyer_name || null, sources: ["ticket"] });
        }
      });

      (locks ?? []).forEach((l: any) => {
        const email = (l.email || "").trim().toLowerCase();
        if (!email) return;
        const existing = map.get(email);
        if (existing) {
          if (!existing.sources.includes("fap")) existing.sources.push("fap");
        } else {
          map.set(email, { email, name: null, sources: ["fap"] });
        }
      });

      setRows(Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email)));
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't load emails");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && !r.sources.includes(filter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.email.includes(q) && !(r.name ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const copyAll = () => {
    const text = filtered.map((r) => r.email).join(", ");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filtered.length} email${filtered.length === 1 ? "" : "s"}`);
  };

  const downloadCsv = () => {
    const header = "email,name,sources\n";
    const body = filtered
      .map((r) => `${r.email},${(r.name ?? "").replace(/,/g, " ")},${r.sources.join("|")}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "otown-emails.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/staff");
  };

  if (!authChecked || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/staff"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <h1 className="font-display text-2xl text-foreground mb-1">Emails</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {rows.length} unique email{rows.length === 1 ? "" : "s"} across ticket buyers and Find a Partner sign-ups.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input
              placeholder="Search email or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button size="sm" variant="outline" onClick={copyAll}>
            <Copy size={14} className="mr-1.5" /> Copy {filtered.length} emails
          </Button>
          <Button size="sm" variant="outline" onClick={downloadCsv}>
            <Download size={14} className="mr-1.5" /> Download CSV
          </Button>
        </div>

        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
          {filtered.map((r) => (
            <div key={r.email} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{r.email}</p>
                {r.name && <p className="text-xs text-muted-foreground truncate">{r.name}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {r.sources.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {sourceLabel[s]}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">No matches.</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Emails;
