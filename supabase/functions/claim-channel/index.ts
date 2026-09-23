/**
 * claim-channel — mint a fresh channel with its own write and read tokens.
 *
 * Unauthenticated by design: this is the zero-signup self-serve path that lets a
 * visitor go from "watching the demo" to "my own webhook URL" in one click.
 *
 * Two properties are load-bearing for safety:
 *   1. The channel key is ALWAYS generated here. A caller can never name the
 *      channel it wants, so this endpoint cannot be used to claim someone else's.
 *   2. The insert is a plain INSERT, never an upsert. A key collision must fail
 *      with 409, never overwrite an existing channel's tokens.
 *
 * The tokens are returned exactly once, in this response. Only their SHA-256
 * hashes are stored, so a lost token is rotated, not recovered.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Channels a single IP prefix may claim per hour. */
const CLAIM_LIMIT_PER_HOUR = 10;

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

  // Optional label, for the user's own reference.
  let label: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.label === 'string' && body.label.length > 0) {
      label = body.label.slice(0, 40);
    }
  } catch {
    // No body is fine.
  }

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

  const row = {
    channel_key: channelKey,
    read_token_hash: await sha256Hex(readToken),
    write_token_hash: await sha256Hex(writeToken),
    write_rotated_at: new Date().toISOString(),
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

  return json(200, { ok: true, channelKey, writeToken, readToken });
});
