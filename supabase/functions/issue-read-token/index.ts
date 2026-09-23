/**
 * issue_read_token — Mint a per-channel read token.
 *
 * Auth, in order:
 *   1. x-ping-write-token matching the channel's stored write_token_hash. This is
 *      how a self-served channel re-mints: holding the write token proves you own
 *      that specific channel, so it cannot be used against anyone else's.
 *   2. x-ping-secret matching PING_INGEST_SECRET, accepted only for a channel
 *      that never claimed a write token. Legacy path; removed once the
 *      deprecation counter in the ingest logs reaches zero.
 *
 * Channel key: ?key= query param or x-ping-channel-key header (32-char hex).
 * Returns: { ok: true, readToken, channelKey }
 *
 * The readToken is 64-char hex (32 random bytes). It is returned once and never
 * logged. Only its SHA-256 hash is stored in ping_channels.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-secret, x-ping-channel-key, x-ping-write-token',
};

const CHANNEL_KEY_REGEX = /^[0-9a-f]{32}$/;
const TOKEN_REGEX = /^[0-9a-f]{64}$/;

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

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Channel key from query param or header
  const url = new URL(req.url);
  const channelKey = (url.searchParams.get('key') ?? req.headers.get('x-ping-channel-key') ?? '').toLowerCase();
  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return json(400, { ok: false, error: 'channel_key: required 32-char hex' });
  }

  // Look up the channel to decide which auth path applies.
  let writeTokenHash: string | null = null;
  let channelExists = false;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ping_channels?channel_key=eq.${channelKey}&select=write_token_hash`,
      { headers: authHeaders },
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        channelExists = true;
        writeTokenHash = typeof rows[0]?.write_token_hash === 'string' ? rows[0].write_token_hash : null;
      }
    }
  } catch {
    return json(500, { ok: false, error: 'Lookup failed' });
  }

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

  // Generate 32 random bytes -> 64-char hex token
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const readToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256Hex(readToken);

  // Update only read_token_hash. A claimed channel's write token is never touched.
  const body = JSON.stringify({ read_token_hash: tokenHash, rotated_at: new Date().toISOString() });
  const writeRes = channelExists
    ? await fetch(`${supabaseUrl}/rest/v1/ping_channels?channel_key=eq.${channelKey}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body,
      })
    : await fetch(`${supabaseUrl}/rest/v1/ping_channels`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          channel_key: channelKey,
          read_token_hash: tokenHash,
          rotated_at: new Date().toISOString(),
        }),
      });

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    console.error('token_register_failed', errText.slice(0, 200));
    return json(500, { ok: false, error: 'Failed to register token' });
  }

  console.log(JSON.stringify({ event: 'read_token_issued', auth: authMode }));

  // Return token once — never log it
  return json(200, { ok: true, readToken, channelKey });
});
