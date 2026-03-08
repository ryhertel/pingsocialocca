CREATE POLICY "Allow service role insert" ON public.ping_analytics
  FOR INSERT TO service_role WITH CHECK (true);