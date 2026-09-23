-- Per-channel write tokens replace the single global PING_INGEST_SECRET.
--
-- Today nothing binds that secret to a channel: the ingest function reads the
-- channel key from an unauthenticated header or query param, so any holder of
-- the global secret can write to any channel. A per-channel hash closes that,
-- and it is what lets a visitor self-serve a channel without an account.
--
-- write_token_hash is deliberately NULLable: NULL marks a legacy channel that
-- never claimed a token, and the ingest function accepts the global secret only
-- for those. New channels are closed to it from the moment they are created.
--
-- Backend functions use the service role and bypass RLS; the deny-all policies
-- from 20260426011802 continue to cover anon and authenticated.

ALTER TABLE public.ping_channels
  ADD COLUMN IF NOT EXISTS write_token_hash text,
  ADD COLUMN IF NOT EXISTS write_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_ip_prefix  text,
  ADD COLUMN IF NOT EXISTS label            text;

-- Supports the per-IP claim throttle when a channel is claimed.
CREATE INDEX IF NOT EXISTS idx_ping_channels_claim_ip
  ON public.ping_channels (claim_ip_prefix, created_at DESC);
