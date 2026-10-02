import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Search, Check, X, Ban, Flag, Trash2, RotateCcw,
} from "lucide-react";

const db = supabase as any;

type Status = "pending" | "approved" | "rejected" | "disabled";

type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  gender: string;
  looking_for: string[];
  bio: string;
  photo_urls: string[];
  status: Status;
  reject_reason?: string | null;
  created_at: string;
};

type Report = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  created_at: string;
};

const STATUS_FILTERS: { value: Status | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "disabled", label: "Disabled" },
  { value: "all", label: "All" },
];

const statusColor: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-500",
  approved: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-destructive/15 text-destructive",
  disabled: "bg-foreground/10 text-foreground/50",
};

const PartnerAdminPanel = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [selectedReports, setSelectedReports] = useState<Report[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profs, error }, { data: reports }] = await Promise.all([
      db.from("partner_profiles").select("*").order("created_at", { ascending: false }),
      db.from("partner_reports").select("reported_id"),
    ]);
    if (error) toast.error("Couldn't load profiles");
    setProfiles(profs ?? []);
    const counts: Record<string, number> = {};
    (reports ?? []).forEach((r: any) => {
      counts[r.reported_id] = (counts[r.reported_id] ?? 0) + 1;
    });
    setReportCounts(counts);
    setLoading(false);
  };

  const openProfile = async (p: Profile) => {
    setSelected(p);
    setShowRejectBox(false);
    setRejectReason(p.reject_reason ?? "");
    const { data } = await db
      .from("partner_reports")
      .select("*")
      .eq("reported_id", p.user_id)
      .order("created_at", { ascending: false });
    setSelectedReports(data ?? []);
  };

  const updateStatus = async (id: string, status: Status, extra: Record<string, any> = {}) => {
    const { error } = await db.from("partner_profiles").update({ status, ...extra }).eq("id", id);
    if (error) return toast.error(error.message);
    setProfiles((p) => p.map((x) => (x.id === id ? { ...x, status, ...extra } : x)));
    setSelected((s) => (s && s.id === id ? { ...s, status, ...extra } : s));
    toast.success("Updated");
  };

  const deleteProfile = async (p: Profile) => {
    if (!confirm(`Permanently delete ${p.display_name}'s profile? This can't be undone.`)) return;
    const { error } = await db.from("partner_profiles").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    setProfiles((cur) => cur.filter((x) => x.id !== p.id));
    setSelected(null);
    toast.success("Profile deleted");
  };

  const filtered = profiles.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.display_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pendingCount = profiles.filter((p) => p.status === "pending").length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
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
              {f.value === "pending" && pendingCount > 0 && ` (${pendingCount})`}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-foreground/50 py-12">No profiles in this view.</p>
      )}

      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => openProfile(p)}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-primary/5 transition"
          >
            <img
              src={p.photo_urls?.[0]}
              className="w-12 h-12 rounded-full object-cover shrink-0 bg-muted"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{p.display_name}, {p.age}</span>
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full shrink-0 ${statusColor[p.status]}`}>
                  {p.status}
                </span>
                {reportCounts[p.user_id] > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-destructive shrink-0">
                    <Flag size={10} /> {reportCounts[p.user_id]}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/50 truncate">{p.bio}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.display_name}, {selected.age}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                {selected.photo_urls?.map((url, i) => (
                  <img key={i} src={url} className="w-24 h-24 rounded-lg object-cover" />
                ))}
              </div>

              <div className="text-sm space-y-1">
                <p><span className="text-foreground/50">Gender:</span> {selected.gender}</p>
                <p><span className="text-foreground/50">Looking for:</span> {selected.looking_for?.join(", ")}</p>
                <p><span className="text-foreground/50">Bio:</span> {selected.bio}</p>
                <p><span className="text-foreground/50">Status:</span>{" "}
                  <span className={`text-xs uppercase px-1.5 py-0.5 rounded-full ${statusColor[selected.status]}`}>
                    {selected.status}
                  </span>
                </p>
                <p className="text-xs text-foreground/40">
                  Joined {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>

              {selectedReports.length > 0 && (
                <div className="border border-destructive/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                    <Flag size={14} /> {selectedReports.length} report{selectedReports.length > 1 ? "s" : ""}
                  </p>
                  {selectedReports.map((r) => (
                    <div key={r.id} className="text-xs text-foreground/70 border-t border-border pt-2">
                      <span className="font-medium">{r.reason}</span>
                      {r.details && <p className="text-foreground/50 mt-0.5">{r.details}</p>}
                      <p className="text-foreground/30 mt-0.5">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {showRejectBox ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Reason (shown to the user, optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateStatus(selected.id, "rejected", { reject_reason: rejectReason.trim() || null })}
                    >
                      Confirm reject
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowRejectBox(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {selected.status !== "approved" && (
                    <Button size="sm" onClick={() => updateStatus(selected.id, "approved")}>
                      <Check size={14} className="mr-1" /> Approve
                    </Button>
                  )}
                  {selected.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setShowRejectBox(true)}>
                      <X size={14} className="mr-1" /> Reject
                    </Button>
                  )}
                  {selected.status !== "disabled" ? (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(selected.id, "disabled")}>
                      <Ban size={14} className="mr-1" /> Disable
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(selected.id, "approved")}>
                      <RotateCcw size={14} className="mr-1" /> Re-enable
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteProfile(selected)}
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PartnerAdminPanel;
