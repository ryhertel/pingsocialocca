CREATE TABLE public.ping_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  page text,
  referrer text,
  screen_w smallint,
  screen_h smallint,
  user_agent text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ping_analytics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ping_analytics_created ON public.ping_analytics (created_at DESC);
CREATE INDEX idx_ping_analytics_event ON public.ping_analytics (event_name);