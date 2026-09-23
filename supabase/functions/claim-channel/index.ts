/**
 * claim-channel — mint a fresh channel with its own write token, read token and
 * inbound email address; or rotate that address.
 *
 * Unauthenticated for a new claim by design: this is the zero-signup self-serve
 * path that lets a visitor go from "watching the demo" to "my own webhook URL"
 * in one click.
 *
 * Two properties are load-bearing for safety:
 *   1. The channel key is ALWAYS generated here. A caller can never name the
 *      channel it wants, so this endpoint cannot be used to claim someone else's.
 *   2. The insert is a plain INSERT, never an upsert. A key collision must fail
 *      with 409, never overwrite an existing channel's tokens.
 *
 * The email alias is a separate random value, deliberately NOT derived from the
 * channel key: the address travels through forwarding rules and other people's
 * inboxes, so leaking it must not leak anything else. Rotation requires the
 * write token, which proves you own that specific channel.
 *
 * Tokens are returned exactly once. Only SHA-256 hashes are stored.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-write-token',
};

/** Channels a single IP prefix may claim per hour. */
const CLAIM_LIMIT_PER_HOUR = 10;

const CHANNEL_KEY_REGEX = /^[0-9a-f]{32}$/;
const TOKEN_REGEX = /^[0-9a-f]{64}$/;

function hex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array | null {
  if (value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    const b = parseInt(value.substring(i, i + 2), 16);
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

async function tokenMatchesHash(token: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash || !TOKEN_REGEX.test(token)) return false;
  const computed = hexToBytes(await sha256Hex(token));
  const stored = hexToBytes(storedHash);
  if (!computed || !stored || computed.length !== 32 || stored.length !== 32) return false;
  return constantTimeEqual(computed, stored);
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return json(500, { ok: false, error: 'Server misconfigured' });
  }

  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipPrefix = truncateIp(ip);

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // No body is fine — that is a plain claim.
  }

  // ── Rotate the inbound email address ──
  // Authenticated by the channel's own write token, so this can only ever
  // change the address of a channel you already control.
  if (body.action === 'rotate-email') {
    const channelKey = typeof body.channelKey === 'string' ? body.channelKey.toLowerCase() : '';
    const writeToken = typeof body.writeToken === 'string' ? body.writeToken.toLowerCase() : '';
    if (!CHANNEL_KEY_REGEX.test(channelKey)) {
      return json(400, { ok: false, error: 'channelKey: required 32-char hex' });
    }

    let storedHash: string | null = null;
    try {
      const res = await fetch(
        `${url}/rest/v1/ping_channels?channel_key=eq.${channelKey}&select=write_token_hash`,
        { headers: authHeaders },
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && typeof rows[0]?.write_token_hash === 'string') {
          storedHash = rows[0].write_token_hash;
        }
      }
    } catch {
      return json(500, { ok: false, error: 'Lookup failed' });
    }

    if (!await tokenMatchesHash(writeToken, storedHash)) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    const emailAlias = hex(12);
    const patchRes = await fetch(`${url}/rest/v1/ping_channels?channel_key=eq.${channelKey}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email_alias: emailAlias, email_rotated_at: new Date().toISOString() }),
    });

    if (!patchRes.ok) {
      console.error('email_rotate_failed', (await patchRes.text()).slice(0, 200));
      return json(500, { ok: false, error: 'rotate_failed' });
    }

    console.log(JSON.stringify({ event: 'email_alias_rotated' }));
    return json(200, { ok: true, emailAlias });
  }

  // ── Claim a new channel ──

  const label = typeof body.label === 'string' && body.label.length > 0
    ? body.label.slice(0, 40)
    : null;

  // Throttle in the database: the in-memory counters used elsewhere are
  // per-isolate, which is useless for an endpoint that creates persistent rows.
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countRes = await fetch(
      `${url}/rest/v1/ping_channels?claim_ip_prefix=eq.${encodeURIComponent(ipPrefix)}&created_at=gt.${since}&select=channel_key`,
      { headers: authHeaders },
    );
    if (countRes.ok) {
      const rows = await countRes.json();
      if (Array.isArray(rows) && rows.length >= CLAIM_LIMIT_PER_HOUR) {
        return new Response(JSON.stringify({ ok: false, error: 'Too many channels claimed. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' },
        });
      }
    }
  } catch {
    // A failed throttle check must not block a legitimate claim.
  }

  const channelKey = hex(16); // 32 hex, matches CHANNEL_KEY_REGEX
  const writeToken = hex(32); // 64 hex
  const readToken = hex(32); // 64 hex
  const emailAlias = hex(12); // 24 hex — short enough to live in an address

  const row = {
    channel_key: channelKey,
    read_token_hash: await sha256Hex(readToken),
    write_token_hash: await sha256Hex(writeToken),
    write_rotated_at: new Date().toISOString(),
    email_alias: emailAlias,
    email_rotated_at: new Date().toISOString(),
    claim_ip_prefix: ipPrefix,
    label,
  };

  // Plain INSERT. No Prefer: resolution=merge-duplicates — a collision must 409.
  const insertRes = await fetch(`${url}/rest/v1/ping_channels`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('claim_failed', insertRes.status, text.slice(0, 200));
    return json(500, { ok: false, error: 'claim_failed' });
  }

  console.log(JSON.stringify({ event: 'channel_claimed', ip: ipPrefix, labelled: label !== null }));

  return json(200, { ok: true, channelKey, writeToken, readToken, emailAlias });
});
