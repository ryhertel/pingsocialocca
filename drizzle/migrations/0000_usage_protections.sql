-- Cost protections: a rate limit every function instance shares, and automatic
-- cleanup so storage cannot grow without bound.
--
-- Until now the only throttle on writes was an in-memory counter, which resets
-- whenever an instance restarts and is not shared between instances, and nothing
-- ever deleted an event. Both are fixed here.

-- ── 1. Shared hourly budgets ──

CREATE TABLE IF NOT EXISTS public.ping_rate_limits (
  bucket       text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

ALTER TABLE public.ping_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) can touch it.

-- Counts one hit against a bucket and says whether it is still inside the limit.
-- One atomic upsert, so concurrent instances cannot undercount.
CREATE OR REPLACE FUNCTION public.ping_rate_hit(p_bucket text, p_window_seconds int, p_limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  n int;
BEGIN
  INSERT INTO public.ping_rate_limits AS r (bucket, window_start, hits)
  VALUES (p_bucket, w, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO n;
  RETURN n <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.ping_rate_hit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ping_rate_hit(text, int, int) TO service_role;

-- ── 2. Retention ──

-- Age-based cleanup scans on this alone.
CREATE INDEX IF NOT EXISTS idx_ping_events_created_at ON public.ping_events (created_at);

-- Keeps 30 days of events and at most 5,000 per channel, so one noisy channel
-- cannot hold a large share of the table even inside the window. Page-view
-- analytics keep 180 days; rate-limit counters only matter for a day.
CREATE OR REPLACE FUNCTION public.prune_ping_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ping_events WHERE created_at < now() - interval '30 days';

  DELETE FROM public.ping_events e
  USING (
    SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY channel_key ORDER BY created_at DESC) AS rn
      FROM public.ping_events
      WHERE channel_key IN (
        SELECT channel_key FROM public.ping_events GROUP BY channel_key HAVING count(*) > 5000
      )
    ) ranked
    WHERE rn > 5000
  ) over_cap
  WHERE e.id = over_cap.id;

  DELETE FROM public.ping_analytics WHERE created_at < now() - interval '180 days';
  DELETE FROM public.ping_rate_limits WHERE window_start < now() - interval '2 days';
END;
$$;

REVOKE ALL ON FUNCTION public.prune_ping_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_ping_data() TO service_role;

-- Run it nightly. Wrapped so a project without pg_cron still applies this
-- migration; in that case prune_ping_data() must be scheduled another way.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('ping-prune', '17 3 * * *', 'SELECT public.prune_ping_data()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable (%); schedule public.prune_ping_data() manually', SQLERRM;
END;
$$;
