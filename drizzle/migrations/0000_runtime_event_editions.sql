CREATE TABLE public.event_editions (
 edition text PRIMARY KEY,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 active boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_editions TO anon, authenticated;
GRANT ALL ON public.event_editions TO service_role;
ALTER TABLE public.event_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public event details" ON public.event_editions FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX one_active_event ON public.event_editions (active) WHERE active;
CREATE OR REPLACE FUNCTION public.publish_event_edition(p_details jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE key text;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF jsonb_typeof(p_details) <> 'object' OR COALESCE((p_details->>'num')::int,0) < 1 OR length(COALESCE(p_details->>'title','')) < 2 OR length(COALESCE(p_details->>'venue','')) < 2 OR (p_details->>'startsAt')::timestamptz IS NULL OR COALESCE(p_details->>'img','') NOT LIKE 'https://%' THEN RAISE EXCEPTION 'Complete event details required'; END IF;
 IF jsonb_typeof(p_details->'prices') <> 'object' OR COALESCE((p_details->'prices'->>'Early Bird')::int,0) <= 0 OR COALESCE((p_details->'prices'->>'Regular')::int,0) <= 0 OR COALESCE((p_details->'prices'->>'VIP Experience')::int,0) <= 0 THEN RAISE EXCEPTION 'Valid ticket prices required'; END IF;
 PERFORM pg_advisory_xact_lock(728194);
 key := 'Otown Party ' || (p_details->>'num') || '.0 - ' || (p_details->>'title');
 UPDATE public.event_editions SET active = false WHERE active;
 INSERT INTO public.event_editions(edition,details,active) VALUES(key,p_details,true) ON CONFLICT(edition) DO UPDATE SET details=excluded.details, active=true, updated_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.publish_event_edition(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_event_edition(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.assign_current_event_edition() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_key text;
BEGIN
 SELECT edition INTO current_key FROM public.event_editions WHERE active;
 IF current_key IS NOT NULL THEN NEW.edition := current_key; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER current_event_payment_intents BEFORE INSERT ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.assign_current_event_edition();
CREATE TRIGGER current_event_ticket_purchases BEFORE INSERT ON public.ticket_purchases FOR EACH ROW EXECUTE FUNCTION public.assign_current_event_edition();
CREATE TRIGGER current_event_vendor_applications BEFORE INSERT ON public.vendor_applications FOR EACH ROW EXECUTE FUNCTION public.assign_current_event_edition();