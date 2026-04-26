-- Make the intended deny-by-default client access model explicit for ping_channels.
-- Backend functions using the service role continue to bypass RLS for the controlled token flow.

DROP POLICY IF EXISTS "No direct client reads for ping channels" ON public.ping_channels;
DROP POLICY IF EXISTS "No direct client writes for ping channels" ON public.ping_channels;
DROP POLICY IF EXISTS "No direct client updates for ping channels" ON public.ping_channels;
DROP POLICY IF EXISTS "No direct client deletes for ping channels" ON public.ping_channels;

CREATE POLICY "No direct client reads for ping channels"
ON public.ping_channels
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No direct client writes for ping channels"
ON public.ping_channels
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct client updates for ping channels"
ON public.ping_channels
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct client deletes for ping channels"
ON public.ping_channels
FOR DELETE
TO anon, authenticated
USING (false);