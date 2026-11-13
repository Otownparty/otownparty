ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS email_error text, ADD COLUMN IF NOT EXISTS email_attempts integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz;
CREATE TABLE public.email_job_state (id text PRIMARY KEY, lease_until timestamptz, paused_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.email_job_state TO service_role;
ALTER TABLE public.email_job_state ENABLE ROW LEVEL SECURITY;