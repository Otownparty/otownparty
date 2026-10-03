CREATE POLICY "No public access to partner device locks"
ON public.partner_device_locks
FOR ALL
TO public
USING (false)
WITH CHECK (false);