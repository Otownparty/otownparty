ALTER TABLE public.payment_intents ADD COLUMN event_details jsonb;
ALTER TABLE public.vendor_applications ADD COLUMN event_details jsonb;
CREATE OR REPLACE FUNCTION public.assign_current_event_edition() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_key text; current_details jsonb;
BEGIN
 SELECT edition, details INTO current_key, current_details FROM public.event_editions WHERE active;
 IF current_key IS NOT NULL THEN NEW.edition := current_key; END IF;
 IF TG_TABLE_NAME IN ('payment_intents', 'vendor_applications') THEN NEW.event_details := current_details; END IF;
 RETURN NEW;
END; $$;