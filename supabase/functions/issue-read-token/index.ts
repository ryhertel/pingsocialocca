/**
 * Channel credentials.
 *
 * Three actions behind one endpoint, chosen by the `action` field in the body:
 *
 *   (none)         Mint a read token for an existing channel. The original
 *                  behaviour, unchanged — callers that send no body still work.
 *   claim          Create a brand new channel with its own write token, read
 *                  token and inbound email address. No account required.
 *   rotate-email   Issue a new inbound email address, invalidating the old one.
 *
 * ── Why these share a function ──────────────────────────────────────────────
 *
 * This project's deploy pipeline updates edge functions it already knows about,
 * but does not appear to create new function directories. `ingest` and this file
 * both picked up their changes on merge; `claim-channel` sat at 404 through both
 * a Lovable deploy and a CLI attempt. Rather than keep fighting that, the claim
 * logic lives here, in a function that demonstrably deploys.
 *
 * The name is now narrower than what it does. That is the price of shipping;
 * renaming it would recreate the exact problem it is working around.
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 *
 *   Read token:   the channel's write token, or the legacy global secret for a
 *                 channel that never claimed one.
 *   Claim:        unauthenticated by design — this is the zero-signup path.
 *   Rotate email: the channel's write token, which proves you own that channel.
 *
 * Two properties of `claim` are load-bearing for safety:
 *   1. The channel key is ALWAYS generated here, so a caller can never name the
 *      channel it wants and cannot claim someone else's.
 *   2. The insert is a plain INSERT, never an upsert. A key collision must fail,
 *      never overwrite an existing channel's tokens.
 *
 * Tokens are returned exactly once. Only SHA-256 hashes are stored.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-secret, x-ping-channel-key, x-ping-write-token',
};

const CHANNEL_KEY_REGEX = /^[0-9a-f]{32}$/;
const TOKEN_REGEX = /^[0-9a-f]{64}$/;

/** Channels a single IP prefix may claim per hour. */
const CLAIM_LIMIT_PER_HOUR = 10;

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const b = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(b)) return null;
    bytes[i / 2] = b;
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function digestsMatch(a: string, b: string): Promise<boolean> {
  const ha = hexToBytes(await sha256Hex(a));
  const hb = hexToBytes(await sha256Hex(b));
  if (!ha || !hb || ha.length !== 32 || hb.length !== 32) return false;
  return constantTimeEqual(ha, hb);
}

async function tokenMatchesHash(token: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash || !TOKEN_REGEX.test(token)) return false;
  const computed = hexToBytes(await sha256Hex(token));
  const stored = hexToBytes(storedHash);
  if (!computed || !stored || computed.length !== 32 || stored.length !== 32) return false;
  return constantTimeEqual(computed, stored);
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function truncateIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return 'unknown';
}

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface ServiceConfig {
  url: string;
  authHeaders: Record<string, string>;
}

/** Look up one channel's stored write-token hash. Null when the channel is unknown. */
async function fetchChannel(
  cfg: ServiceConfig,
  channelKey: string,
): Promise<{ writeTokenHash: string | null } | null> {
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/ping_channels?channel_key=eq.${channelKey}&select=write_token_hash`,
      { headers: cfg.authHeaders },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return {
      writeTokenHash: typeof rows[0]?.write_token_hash === 'string' ? rows[0].write_token_hash : null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { ok: false, error: 'Server misconfigured' });
  }
  const cfg: ServiceConfig = {
    url: supabaseUrl,
    authHeaders: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  };

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipPrefix = truncateIp(ip);

  // A body is optional: the original read-token call sends none.
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    /* no body is fine */
  }

  const action = typeof body.action === 'string' ? body.action : '';

  // ── Claim a new channel ──

  if (action === 'claim') {
    const label = typeof body.label === 'string' && body.label.length > 0
      ? body.label.slice(0, 40)
      : null;

    // Throttle in the database: in-memory counters are per-isolate, which is
    // useless for an endpoint that creates persistent rows.
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const countRes = await fetch(
        `${cfg.url}/rest/v1/ping_channels?claim_ip_prefix=eq.${encodeURIComponent(ipPrefix)}&created_at=gt.${since}&select=channel_key`,
        { headers: cfg.authHeaders },
      );
      if (countRes.ok) {
        const rows = await countRes.json();
        if (Array.isArray(rows) && rows.length >= CLAIM_LIMIT_PER_HOUR) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Too many channels claimed. Try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } },
          );
        }
      }
    } catch {
      /* a failed throttle check must not block a legitimate claim */
    }

    const channelKey = randomHex(16); // 32 hex, matches CHANNEL_KEY_REGEX
    const writeToken = randomHex(32); // 64 hex
    const readToken = randomHex(32); // 64 hex
    const emailAlias = randomHex(12); // 24 hex — short enough to live in an address
    const now = new Date().toISOString();

    // Plain INSERT. No Prefer: resolution=merge-duplicates — a collision must fail.
    const insertRes = await fetch(`${cfg.url}/rest/v1/ping_channels`, {
      method: 'POST',
      headers: { ...cfg.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        channel_key: channelKey,
        read_token_hash: await sha256Hex(readToken),
        write_token_hash: await sha256Hex(writeToken),
        write_rotated_at: now,
        email_alias: emailAlias,
        email_rotated_at: now,
        claim_ip_prefix: ipPrefix,
        label,
      }),
    });

    if (!insertRes.ok) {
      console.error('claim_failed', insertRes.status, (await insertRes.text()).slice(0, 200));
      return json(500, { ok: false, error: 'claim_failed' });
    }

    console.log(JSON.stringify({ event: 'channel_claimed', ip: ipPrefix, labelled: label !== null }));
    return json(200, { ok: true, channelKey, writeToken, readToken, emailAlias });
  }

  // ── Rotate the inbound email address ──

  if (action === 'rotate-email') {
    const channelKey = typeof body.channelKey === 'string' ? body.channelKey.toLowerCase() : '';
    const writeToken = typeof body.writeToken === 'string' ? body.writeToken.toLowerCase() : '';
    if (!CHANNEL_KEY_REGEX.test(channelKey)) {
      return json(400, { ok: false, error: 'channelKey: required 32-char hex' });
    }

    const channel = await fetchChannel(cfg, channelKey);
    if (!await tokenMatchesHash(writeToken, channel?.writeTokenHash ?? null)) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    const emailAlias = randomHex(12);
    const patchRes = await fetch(`${cfg.url}/rest/v1/ping_channels?channel_key=eq.${channelKey}`, {
      method: 'PATCH',
      headers: { ...cfg.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email_alias: emailAlias, email_rotated_at: new Date().toISOString() }),
    });

    if (!patchRes.ok) {
      console.error('email_rotate_failed', (await patchRes.text()).slice(0, 200));
      return json(500, { ok: false, error: 'rotate_failed' });
    }

    console.log(JSON.stringify({ event: 'email_alias_rotated' }));
    return json(200, { ok: true, emailAlias });
  }

  // ── Mint a read token (the original behaviour, unchanged) ──

  const url = new URL(req.url);
  const channelKey = (url.searchParams.get('key') ?? req.headers.get('x-ping-channel-key') ?? '').toLowerCase();
  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return json(400, { ok: false, error: 'channel_key: required 32-char hex' });
  }

  const channel = await fetchChannel(cfg, channelKey);
  const channelExists = channel !== null;
  const writeTokenHash = channel?.writeTokenHash ?? null;

  const providedWriteToken = (req.headers.get('x-ping-write-token') ?? '').toLowerCase();
  const providedSecret = req.headers.get('x-ping-secret');
  const globalSecret = Deno.env.get('PING_INGEST_SECRET');

  let authorized = false;
  let authMode = 'none';

  if (providedWriteToken && await tokenMatchesHash(providedWriteToken, writeTokenHash)) {
    authorized = true;
    authMode = 'channel_token';
  } else if (providedSecret && writeTokenHash === null && globalSecret && await digestsMatch(providedSecret, globalSecret)) {
    authorized = true;
    authMode = 'legacy_global';
  }

  if (!authorized) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  const readToken = randomHex(32);
  const tokenHash = await sha256Hex(readToken);
  const rotatedAt = new Date().toISOString();

  // Update only read_token_hash. A claimed channel's write token is never touched.
  const writeRes = channelExists
    ? await fetch(`${cfg.url}/rest/v1/ping_channels?channel_key=eq.${channelKey}`, {
        method: 'PATCH',
        headers: { ...cfg.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ read_token_hash: tokenHash, rotated_at: rotatedAt }),
      })
    : await fetch(`${cfg.url}/rest/v1/ping_channels`, {
        method: 'POST',
        headers: { ...cfg.authHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ channel_key: channelKey, read_token_hash: tokenHash, rotated_at: rotatedAt }),
      });

  if (!writeRes.ok) {
    console.error('token_register_failed', (await writeRes.text()).slice(0, 200));
    return json(500, { ok: false, error: 'Failed to register token' });
  }

  console.log(JSON.stringify({ event: 'read_token_issued', auth: authMode }));

  // Return token once — never log it
  return json(200, { ok: true, readToken, channelKey });
});
