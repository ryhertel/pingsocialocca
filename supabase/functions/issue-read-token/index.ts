/**
 * issue_read_token — Mint a per-channel read token.
 *
 * Auth: x-ping-secret header must match PING_INGEST_SECRET.
 * Channel key: ?key= query param or x-ping-channel-key header (32-char hex).
 * Returns: { ok: true, readToken, channelKey }
 *
 * The readToken is 64-char hex (32 random bytes). It is returned once and never logged.
 * A SHA-256 hash of the token is stored in ping_channels.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-secret, x-ping-channel-key',
};

const CHANNEL_KEY_REGEX = /^[0-9a-f]{32}$/;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate via shared secret
  const secret = Deno.env.get('PING_INGEST_SECRET');
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const providedSecret = req.headers.get('x-ping-secret');
  if (!providedSecret || providedSecret !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Channel key from query param or header
  const url = new URL(req.url);
  const channelKey = (url.searchParams.get('key') ?? req.headers.get('x-ping-channel-key') ?? '').toLowerCase();
  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return new Response(JSON.stringify({ ok: false, error: 'channel_key: required 32-char hex' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate 32 random bytes -> 64-char hex token
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const readToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Hash the token
  const tokenHash = await sha256Hex(readToken);

  // Upsert into ping_channels via REST (service role)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/ping_channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      channel_key: channelKey,
      read_token_hash: tokenHash,
      rotated_at: new Date().toISOString(),
    }),
  });

  if (!upsertRes.ok) {
    const errText = await upsertRes.text();
    console.error('upsert_failed', errText);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to register token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Return token once — never log it
  return new Response(JSON.stringify({ ok: true, readToken, channelKey }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
