CREATE TABLE public.raver_invites_sent (email text PRIMARY KEY, sent_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.raver_invites_sent TO service_role;
ALTER TABLE public.raver_invites_sent ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.raver_email_optouts (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.raver_email_optouts TO service_role;
ALTER TABLE public.raver_email_optouts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.partner_alert_state (user_id uuid PRIMARY KEY, last_alert_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.partner_alert_state TO service_role;
ALTER TABLE public.partner_alert_state ENABLE ROW LEVEL SECURITY;