import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditionPanel from "@/components/staff/EditionPanel";
import { supabase } from "@/integrations/supabase/client";

export default function EditionUpdate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/staff?next=/staff/edition", { replace: true });
        return;
      }
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
      if (cancelled) return;
      if (error || !roles?.some(role => role.role === "admin")) {
        navigate("/scan", { replace: true });
        return;
      }
      setReady(true);
    };
    void check();
    return () => { cancelled = true; };
  }, [navigate]);

  if (!ready) return <main className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" aria-label="Loading" size={32} /></main>;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="ghost" className="mb-6 text-muted-foreground hover:text-primary">
          <Link to="/staff"><ArrowLeft size={16} className="mr-2" />Staff Dashboard</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Edition update</h1>
        <EditionPanel />
      </div>
    </main>
  );
}