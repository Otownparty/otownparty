import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Ticket, Heart, ScanLine, Mail, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const STAFF_EMAIL_DOMAIN = "staff.otownparty.com";

// Staff sign in with a username. Emails still work for admin accounts.
const toEmail = (input: string) => {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${STAFF_EMAIL_DOMAIN}`;
};

const TILES = [
  {
    key: "tickets",
    label: "Tickets",
    desc: "Ticket purchases & vendor records",
    icon: Ticket,
    path: "/record",
  },
  {
    key: "partner",
    label: "Find a Partner",
    desc: "Review, approve & manage profiles",
    icon: Heart,
    path: "/staff/partner",
  },
  {
    key: "scanner",
    label: "Scanner",
    desc: "Gate scanning setup & access",
    icon: ScanLine,
    path: "/scan",
  },
  {
    key: "emails",
    label: "Emails",
    desc: "All ticket buyer & FAP emails",
    icon: Mail,
    path: "/staff/emails",
  },
];

const StaffAuth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicitNext = params.get("next");

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const checkAdmin = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return (roles ?? []).some((r) => r.role === "admin");
  };

  const resolveSession = async (userId: string | null) => {
    if (!userId) {
      setSignedIn(false);
      setChecking(false);
      return;
    }
    setSignedIn(true);
    // An explicit ?next= always wins (used by direct scanner links etc.)
    if (explicitNext) {
      navigate(explicitNext, { replace: true });
      return;
    }
    const admin = await checkAdmin(userId);
    setIsAdmin(admin);
    // Scanner-only accounts have no use for the dashboard — send them
    // straight to the scanner. Admins see the tile menu below.
    if (!admin) {
      navigate("/scan", { replace: true });
      return;
    }
    setChecking(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      resolveSession(data.session?.user?.id ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toEmail(username),
        password,
      });
      if (error) throw error;
      setChecking(true);
      await resolveSession(data.user.id);
    } catch (err) {
      toast.error("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSignedIn(false);
    setIsAdmin(false);
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8">
          <h1 className="font-display font-bold text-2xl text-foreground mb-1">Staff Sign In</h1>
          <p className="text-sm text-muted-foreground mb-6">Access the staff dashboard.</p>
          <form onSubmit={handle} className="space-y-4">
            <input
              type="text" required autoCapitalize="none" autoCorrect="off"
              placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="password" required placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin inline" /> : "Sign In"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Signed in + admin: dashboard tile menu.
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-foreground">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground">Pick a section to manage.</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {TILES.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(t.path)}
              className="flex flex-col items-start gap-3 p-5 rounded-xl bg-card border border-border text-left hover:border-primary hover:bg-primary/5 transition"
            >
              <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <t.icon size={20} />
              </span>
              <span>
                <span className="block font-display text-lg text-foreground">{t.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default StaffAuth;
