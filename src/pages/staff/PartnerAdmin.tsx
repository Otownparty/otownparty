import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, LogOut } from "lucide-react";
import PartnerAdminPanel from "@/components/staff/PartnerAdminPanel";

const PartnerAdmin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/staff?next=/staff/partner", { replace: true });
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/staff");
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="container mx-auto max-w-3xl">
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

        <h1 className="font-display text-2xl text-foreground mb-6">Find A Raver — Admin</h1>

        <PartnerAdminPanel />
      </div>
    </main>
  );
};

export default PartnerAdmin;
