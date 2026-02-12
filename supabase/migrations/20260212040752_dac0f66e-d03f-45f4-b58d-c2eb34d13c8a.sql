
-- Create ping_channels table for read token storage
CREATE TABLE IF NOT EXISTS public.ping_channels (
  channel_key text PRIMARY KEY,
  read_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

-- Enable RLS with no policies (no anon access)
ALTER TABLE public.ping_channels ENABLE ROW LEVEL SECURITY;

-- Drop the open-read policy on ping_events
DROP POLICY IF EXISTS "anon_select_ping_events" ON public.ping_events;
