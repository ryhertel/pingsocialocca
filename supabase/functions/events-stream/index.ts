/**
 * events_stream — SSE stream of new events for an authorized channel.
 *
 * Auth via query params (EventSource can't send headers):
 *   GET /functions/v1/events_stream?key=<channelKey>&token=<readToken>
 *
 * Fix 1: Constant-time compare (no branching, 32-byte SHA-256 enforced at parse time)
 * Fix 2: Poll uses received_at > lastSeen, ordered by received_at ASC
 *
 * Sends: event: ping\ndata: <json>\n\n
 * Keepalive: : keepalive\n\n every 15s
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

  const url = new URL(req.url);
  const channelKey = (url.searchParams.get('key') ?? '').toLowerCase();
  const readToken = (url.searchParams.get('token') ?? '').toLowerCase();

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

  // Hash + validate token
  const providedHash = await sha256Hex(readToken);
  const providedHashBytes = hexToBytes(providedHash);
  if (!providedHashBytes || providedHashBytes.length !== 32) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch stored hash
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

  if (!constantTimeEqual(providedHashBytes, storedHashBytes)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // SSE stream
  let lastSeen = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      // Initial keepalive
      send(': connected\n\n');

      const poll = async () => {
        if (closed) return;

        try {
          const queryUrl = `${supabaseUrl}/rest/v1/ping_events?channel_key=eq.${channelKey}&received_at=gt.${lastSeen}&order=received_at.asc&limit=50`;
          const res = await fetch(queryUrl, {
            headers: {
              'apikey': serviceKey!,
              'Authorization': `Bearer ${serviceKey}`,
            },
          });

          if (res.ok) {
            const rows = await res.json() as Record<string, unknown>[];
            for (const row of rows) {
              const event = {
                id: row.id,
                source: row.source,
                eventType: row.event_type,
                title: row.title,
                body: row.body ?? undefined,
                tags: row.tags ?? undefined,
                severity: row.severity,
                timestamp: Number(row.timestamp),
                receivedAt: Number(row.received_at),
              };
              send(`event: ping\ndata: ${JSON.stringify(event)}\n\n`);
              const ra = Number(row.received_at);
              if (ra > lastSeen) lastSeen = ra;
            }
          }
        } catch {
          // Silently continue polling
        }
      };

      // Poll loop: every 2s
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          clearInterval(keepaliveInterval);
          return;
        }
        await poll();
      }, 2000);

      // Keepalive: every 15s
      const keepaliveInterval = setInterval(() => {
        if (closed) {
          clearInterval(pollInterval);
          clearInterval(keepaliveInterval);
          return;
        }
        send(': keepalive\n\n');
      }, 15000);

      // Listen for abort (client disconnect)
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(keepaliveInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
