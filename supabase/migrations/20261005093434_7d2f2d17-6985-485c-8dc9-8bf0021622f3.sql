CREATE TABLE IF NOT EXISTS public.ticket_locks (
  ticket_name text PRIMARY KEY,
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_locks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_locks TO authenticated;
GRANT ALL ON public.ticket_locks TO service_role;
ALTER TABLE public.ticket_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ticket locks" ON public.ticket_locks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage ticket locks" ON public.ticket_locks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_ticket_locks_updated_at BEFORE UPDATE ON public.ticket_locks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ticket_banner (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_banner TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_banner TO authenticated;
GRANT ALL ON public.ticket_banner TO service_role;
ALTER TABLE public.ticket_banner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ticket banner" ON public.ticket_banner FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage ticket banner" ON public.ticket_banner FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_ticket_banner_updated_at BEFORE UPDATE ON public.ticket_banner FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ticket_locks (ticket_name, locked) VALUES ('Early Bird', true), ('Regular', false), ('VIP Experience', false) ON CONFLICT DO NOTHING;
INSERT INTO public.ticket_banner (id) VALUES (true) ON CONFLICT DO NOTHING;