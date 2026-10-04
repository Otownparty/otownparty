CREATE OR REPLACE FUNCTION public.handle_partner_swipe()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.direction = 'right' THEN
    PERFORM pg_advisory_xact_lock(hashtext(LEAST(NEW.swiper_id::text, NEW.swiped_id::text) || GREATEST(NEW.swiper_id::text, NEW.swiped_id::text)));
    IF EXISTS (SELECT 1 FROM partner_swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'right')
       AND NOT EXISTS (SELECT 1 FROM partner_matches WHERE (user_a = NEW.swiper_id AND user_b = NEW.swiped_id) OR (user_a = NEW.swiped_id AND user_b = NEW.swiper_id)) THEN
      INSERT INTO partner_matches (user_a, user_b, chat_expires_at) VALUES (NEW.swiper_id, NEW.swiped_id, NULL);
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Start the 24h clock when the second person sends their first message.
CREATE OR REPLACE FUNCTION public.start_partner_chat_timer()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE partner_matches m SET chat_expires_at = now() + interval '24 hours'
  WHERE m.id = NEW.match_id AND m.chat_expires_at IS NULL
    AND EXISTS (SELECT 1 FROM partner_messages pm WHERE pm.match_id = NEW.match_id AND pm.sender_id <> NEW.sender_id);
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS on_partner_message_timer ON public.partner_messages;
CREATE TRIGGER on_partner_message_timer AFTER INSERT ON public.partner_messages
FOR EACH ROW EXECUTE FUNCTION public.start_partner_chat_timer();

DROP POLICY IF EXISTS "Send match messages" ON public.partner_messages;
CREATE POLICY "Send match messages" ON public.partner_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM partner_matches m
  WHERE m.id = partner_messages.match_id AND (auth.uid() = m.user_a OR auth.uid() = m.user_b)
  AND (m.chat_expires_at IS NULL OR now() < m.chat_expires_at)));

-- Existing matches that never got a reply get a fresh start.
UPDATE public.partner_matches m SET chat_expires_at = NULL
WHERE (SELECT count(DISTINCT sender_id) FROM public.partner_messages pm WHERE pm.match_id = m.id) < 2;