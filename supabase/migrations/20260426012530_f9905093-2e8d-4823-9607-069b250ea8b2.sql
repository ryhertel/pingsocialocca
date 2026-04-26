-- Explicit deny-by-default policies for ping_analytics to make intent clear.
-- Analytics are written only by the service-role 'analytics' edge function.
-- Clients (anon/authenticated) must never read, update, or delete analytics rows.

CREATE POLICY "No direct client reads for ping analytics"
ON public.ping_analytics
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No direct client inserts for ping analytics"
ON public.ping_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct client updates for ping analytics"
ON public.ping_analytics
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct client deletes for ping analytics"
ON public.ping_analytics
FOR DELETE
TO anon, authenticated
USING (false);
