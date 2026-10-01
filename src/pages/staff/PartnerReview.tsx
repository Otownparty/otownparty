import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, Ban } from "lucide-react";

const db = supabase as any;

type PendingProfile = {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  gender: string;
  looking_for: string[];
  bio: string;
  photo_urls: string[];
  status: string;
  created_at: string;
};

const PartnerReview = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/staff", { replace: true });
        return;
      }
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (authChecked) load();
  }, [authChecked]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("partner_profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) toast.error("Couldn't load profiles");
    setProfiles(data ?? []);
    setLoading(false);
  };

  const approve = async (id: string) => {
    const { error } = await db
      .from("partner_profiles")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Approved");
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    const { error } = await db
      .from("partner_profiles")
      .update({ status: "rejected", reject_reason: rejectReason.trim() || null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    setProfiles((p) => p.filter((x) => x.id !== id));
    setRejectingId(null);
    setRejectReason("");
  };

  const disable = async (id: string) => {
    const { error } = await db
      .from("partner_profiles")
      .update({ status: "disabled" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Disabled");
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="container mx-auto max-w-3xl">
        <h1 className="font-display text-2xl mb-6">
          Partner profile review ({profiles.length} pending)
        </h1>

        {profiles.length === 0 && (
          <p className="text-foreground/60">Nothing pending. Nice.</p>
        )}

        <div className="space-y-4">
          {profiles.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex gap-4">
                <div className="flex gap-2">
                  {p.photo_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg">
                    {p.display_name}, {p.age} · {p.gender}
                  </p>
                  <p className="text-xs text-foreground/50">
                    Looking for: {p.looking_for.join(", ")}
                  </p>
                  <p className="text-sm text-foreground/70 mt-1">{p.bio}</p>
                </div>
              </div>

              {rejectingId === p.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Reason (shown to the user, optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => reject(p.id)}>
                      Confirm reject
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRejectingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => approve(p.id)}>
                    <Check size={14} className="mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectingId(p.id)}
                  >
                    <X size={14} className="mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => disable(p.id)}>
                    <Ban size={14} className="mr-1" /> Disable
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerReview;
