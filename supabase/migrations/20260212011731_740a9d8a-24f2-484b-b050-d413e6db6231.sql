
CREATE TABLE public.ping_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key text NOT NULL,
  source text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  tags text[],
  severity int2 NOT NULL DEFAULT 1,
  timestamp bigint NOT NULL,
  received_at bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ping_events_channel_created
  ON public.ping_events (channel_key, created_at DESC);

ALTER TABLE public.ping_events ENABLE ROW LEVEL SECURITY;

-- MVP RLS: open read for anon. Events contain only redacted metadata
-- (no PII, no secrets, no raw payloads). Channel keys are random 32-char hex.
-- Client subscribes with channel_key=eq.<key> filter.
-- Stage 3 will tighten RLS with per-channel read tokens or signed JWT claims.
CREATE POLICY "anon_select_ping_events"
  ON public.ping_events FOR SELECT TO anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ping_events;
