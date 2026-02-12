/**
 * events_read — Fetch recent events for an authorized channel.
 *
 * Headers: x-ping-channel-key (32 hex), x-ping-read-token (64 hex)
 * Query: ?limit=50&since=<epoch_ms>
 *
 * Fix 1: Constant-time compare (no branching, 32-byte SHA-256 enforced at parse time)
 * Fix 2: All ordering and since filters use received_at
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-channel-key, x-ping-read-token',
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
  // Both must be 32 bytes (SHA-256). Callers enforce this before calling.
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const channelKey = (req.headers.get('x-ping-channel-key') ?? '').toLowerCase();
  const readToken = (req.headers.get('x-ping-read-token') ?? '').toLowerCase();

  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid channel key' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!TOKEN_REGEX.test(readToken)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Hash the provided token
  const providedHash = await sha256Hex(readToken);
  const providedHashBytes = hexToBytes(providedHash);
  if (!providedHashBytes || providedHashBytes.length !== 32) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch stored hash from ping_channels
  const channelRes = await fetch(
    `${supabaseUrl}/rest/v1/ping_channels?channel_key=eq.${channelKey}&select=read_token_hash`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    },
  );

  if (!channelRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const channels = await channelRes.json();
  if (!Array.isArray(channels) || channels.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const storedHash = channels[0].read_token_hash as string;
  const storedHashBytes = hexToBytes(storedHash);
  if (!storedHashBytes || storedHashBytes.length !== 32) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Constant-time compare (Fix 1: no branching)
  if (!constantTimeEqual(providedHashBytes, storedHashBytes)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse query params
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const since = url.searchParams.get('since');

  // Query ping_events (Fix 2: order by received_at, filter since on received_at)
  let queryUrl = `${supabaseUrl}/rest/v1/ping_events?channel_key=eq.${channelKey}&order=received_at.desc&limit=${limit}`;
  if (since) {
    const sinceMs = parseInt(since, 10);
    if (!isNaN(sinceMs)) {
      queryUrl += `&received_at=gt.${sinceMs}`;
    }
  }

  const eventsRes = await fetch(queryUrl, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  if (!eventsRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to fetch events' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = await eventsRes.json();
  const events = (rows as Record<string, unknown>[]).map(row => ({
    id: row.id,
    source: row.source,
    eventType: row.event_type,
    title: row.title,
    body: row.body ?? undefined,
    tags: row.tags ?? undefined,
    severity: row.severity,
    timestamp: Number(row.timestamp),
    receivedAt: Number(row.received_at),
  }));

  return new Response(JSON.stringify({ ok: true, events }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
