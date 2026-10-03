CREATE TABLE public.partner_device_locks (
  device_id text PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_device_locks_device_id_length CHECK (char_length(device_id) BETWEEN 1 AND 100),
  CONSTRAINT partner_device_locks_email_length CHECK (char_length(email) BETWEEN 3 AND 255)
);

GRANT ALL ON public.partner_device_locks TO service_role;

ALTER TABLE public.partner_device_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX partner_device_locks_email_idx ON public.partner_device_locks (email);