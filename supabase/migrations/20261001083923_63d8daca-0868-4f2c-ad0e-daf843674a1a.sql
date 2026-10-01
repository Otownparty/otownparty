CREATE TABLE public.partner_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_otp_codes TO service_role;
ALTER TABLE public.partner_otp_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX partner_otp_codes_email_idx ON public.partner_otp_codes (email, created_at DESC);