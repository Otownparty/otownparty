ALTER TABLE public.partner_profiles ADD COLUMN IF NOT EXISTS auto_approve_at timestamptz, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
UPDATE public.partner_profiles SET reviewed_at = COALESCE(reviewed_at, now()) WHERE status <> 'pending';
UPDATE public.partner_profiles SET auto_approve_at = now() + interval '2 minutes' WHERE status = 'pending' AND auto_approve_at IS NULL;

CREATE OR REPLACE FUNCTION public.partner_profile_auto_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending' OR OLD.auto_approve_at IS NULL THEN
      NEW.auto_approve_at := now() + interval '2 minutes';
      NEW.reviewed_at := NULL;
    ELSE
      NEW.auto_approve_at := OLD.auto_approve_at;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NOT public.has_role(auth.uid(),'admin') AND auth.uid() IS NOT NULL THEN
    NEW.auto_approve_at := OLD.auto_approve_at;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER partner_profile_auto_approve BEFORE INSERT OR UPDATE ON public.partner_profiles FOR EACH ROW EXECUTE FUNCTION public.partner_profile_auto_approve();

CREATE OR REPLACE FUNCTION public.apply_partner_auto_approvals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  UPDATE public.partner_profiles SET status = 'approved'
  WHERE status = 'pending' AND auto_approve_at <= now()
    AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.apply_partner_auto_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_partner_auto_approvals() TO authenticated;

DROP POLICY "View approved or own profiles" ON public.partner_profiles;
CREATE POLICY "View approved or own profiles" ON public.partner_profiles FOR SELECT TO authenticated
USING (status = 'approved' OR (status = 'pending' AND auto_approve_at <= now()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.partner_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text', ADD COLUMN IF NOT EXISTS audio_path text, ADD COLUMN IF NOT EXISTS audio_duration integer;

CREATE POLICY "Match members read voice notes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-voice' AND EXISTS (SELECT 1 FROM public.partner_matches m WHERE m.id::text = (storage.foldername(name))[1] AND auth.uid() IN (m.user_a, m.user_b)));
CREATE POLICY "Match members upload voice notes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-voice' AND EXISTS (SELECT 1 FROM public.partner_matches m WHERE m.id::text = (storage.foldername(name))[1] AND auth.uid() IN (m.user_a, m.user_b) AND (m.chat_expires_at IS NULL OR now() < m.chat_expires_at)));