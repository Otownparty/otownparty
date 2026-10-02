CREATE TABLE public.partner_match_reads (
  match_id uuid NOT NULL REFERENCES public.partner_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.partner_match_reads TO authenticated;
GRANT ALL ON public.partner_match_reads TO service_role;
ALTER TABLE public.partner_match_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own read markers select" ON public.partner_match_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own read markers insert" ON public.partner_match_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.partner_matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));
CREATE POLICY "Own read markers update" ON public.partner_match_reads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());