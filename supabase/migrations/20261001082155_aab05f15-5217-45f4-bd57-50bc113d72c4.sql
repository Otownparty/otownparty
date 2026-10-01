CREATE TABLE public.partner_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE, display_name text, age int, gender text, looking_for text[], bio text, photo_urls text[], status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disabled')), reject_reason text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partner_swipes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), swiper_id uuid NOT NULL, swiped_id uuid NOT NULL, direction text NOT NULL CHECK (direction IN ('left','right')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partner_matches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_a uuid NOT NULL, user_b uuid NOT NULL, chat_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partner_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), match_id uuid NOT NULL REFERENCES public.partner_matches(id) ON DELETE CASCADE, sender_id uuid NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partner_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL, reported_id uuid NOT NULL, reason text, details text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partner_blocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), blocker_id uuid NOT NULL, blocked_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT, INSERT, UPDATE ON public.partner_profiles TO authenticated;
GRANT SELECT, INSERT ON public.partner_swipes, public.partner_messages, public.partner_reports, public.partner_blocks TO authenticated;
GRANT SELECT ON public.partner_matches TO authenticated;
GRANT ALL ON public.partner_profiles, public.partner_swipes, public.partner_matches, public.partner_messages, public.partner_reports, public.partner_blocks TO service_role;

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View approved or own profiles" ON public.partner_profiles FOR SELECT TO authenticated USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own profile" ON public.partner_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Update own profile" ON public.partner_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins moderate profiles" ON public.partner_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Insert own swipes" ON public.partner_swipes FOR INSERT TO authenticated WITH CHECK (swiper_id = auth.uid());
CREATE POLICY "View own swipes" ON public.partner_swipes FOR SELECT TO authenticated USING (swiper_id = auth.uid());

CREATE POLICY "View own matches" ON public.partner_matches FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));

CREATE POLICY "View match messages" ON public.partner_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.partner_matches m WHERE m.id = match_id AND auth.uid() IN (m.user_a, m.user_b)));
CREATE POLICY "Send match messages" ON public.partner_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.partner_matches m WHERE m.id = match_id AND auth.uid() IN (m.user_a, m.user_b) AND now() < m.chat_expires_at));

CREATE POLICY "Insert own reports" ON public.partner_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "View own reports" ON public.partner_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Insert own blocks" ON public.partner_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "View own blocks" ON public.partner_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_partner_swipe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'right' THEN
    PERFORM pg_advisory_xact_lock(hashtext(LEAST(NEW.swiper_id::text, NEW.swiped_id::text) || GREATEST(NEW.swiper_id::text, NEW.swiped_id::text)));
    IF EXISTS (SELECT 1 FROM partner_swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'right')
       AND NOT EXISTS (SELECT 1 FROM partner_matches WHERE (user_a = NEW.swiper_id AND user_b = NEW.swiped_id) OR (user_a = NEW.swiped_id AND user_b = NEW.swiper_id)) THEN
      INSERT INTO partner_matches (user_a, user_b, chat_expires_at) VALUES (NEW.swiper_id, NEW.swiped_id, now() + interval '10 minutes');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_partner_swipe() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_partner_swipe AFTER INSERT ON public.partner_swipes FOR EACH ROW EXECUTE FUNCTION public.handle_partner_swipe();

ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_messages;

CREATE POLICY "Partner photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'partner-photos');
CREATE POLICY "Partner photos own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'partner-photos' AND (storage.foldername(name))[1] = auth.uid()::text);