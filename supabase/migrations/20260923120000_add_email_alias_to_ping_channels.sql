-- Inbound email per channel.
--
-- The binding constraint on what Ping can visualize is not adapters — it is
-- whether a source can emit an outbound webhook at all. Dev and infra tooling
-- mostly can; consumer SaaS mostly cannot, but nearly all of it can email you.
-- An address per channel reaches that second category.
--
-- SECURITY: the address IS the credential. Email carries no write token, so
-- anyone who learns the address can post to that feed. Two consequences:
--
--   1. email_alias must be unguessable and must NOT be derived from
--      channel_key — otherwise leaking one leaks the other.
--   2. It must be rotatable, because an email address ends up in places you
--      do not control (forwarding rules, address books, other people's inboxes).
--
-- NULL means email is simply not enabled for that channel; the ingest function
-- only resolves a channel when the alias is present and matches exactly.

ALTER TABLE public.ping_channels
  ADD COLUMN IF NOT EXISTS email_alias      text,
  ADD COLUMN IF NOT EXISTS email_rotated_at timestamptz;

-- Unique so two channels can never share an address, and indexed because every
-- inbound message resolves a channel by this column.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ping_channels_email_alias
  ON public.ping_channels (email_alias)
  WHERE email_alias IS NOT NULL;
