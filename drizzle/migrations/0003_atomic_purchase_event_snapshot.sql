CREATE OR REPLACE FUNCTION public.assign_current_event_edition() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_key text; current_details jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(728194);
 SELECT edition, details INTO current_key, current_details FROM public.event_editions WHERE active;
 IF TG_TABLE_NAME = 'payment_intents' THEN
   IF NEW.event_details IS NOT NULL AND current_key IS NOT NULL AND (NEW.edition <> current_key OR NEW.event_details->'prices' <> current_details->'prices') THEN RAISE EXCEPTION 'Event details changed. Please refresh and choose your ticket again.'; END IF;
   IF current_key IS NOT NULL THEN
     IF NOT COALESCE((current_details->>'salesOpen')::boolean,false) THEN RAISE EXCEPTION 'Online ticket sales are closed'; END IF;
     IF NEW.unit_price <> (current_details->'prices'->>NEW.ticket_type)::integer * 100 THEN RAISE EXCEPTION 'Ticket price changed. Please refresh.'; END IF;
   END IF;
 END IF;
 IF current_key IS NOT NULL THEN NEW.edition := current_key; END IF;
 IF TG_TABLE_NAME IN ('payment_intents', 'vendor_applications') THEN NEW.event_details := current_details; END IF;
 RETURN NEW;
END; $$;