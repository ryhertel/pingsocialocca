/**
 * Ingest Edge Function — Webhook endpoint for external events.
 *
 * Accepts events, validates, redacts, inserts into ping_events table,
 * and returns the normalized event. Realtime subscription delivers
 * events to the UI instantly.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.
 */

// Uses REST API for DB insert to avoid external import boot issues.
// SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-signature, x-ping-secret, x-ping-channel-key',
};

// ── Rate limiting (in-memory, per-instance) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function truncateIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return 'unknown';
}

// ── Redaction ──

const URL_REGEX = /https?:\/\/[^\s)>\]"']+/gi;
const TOKEN_REGEX = /[A-Za-z0-9+/=_-]{20,}/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

function redactField(input: string): string {
  let r = input;
  r = r.replace(CODE_BLOCK_REGEX, '[code]');
  r = r.replace(URL_REGEX, '[link]');
  r = r.replace(TOKEN_REGEX, (match) => {
    if (/^[a-zA-Z]+$/.test(match) && match.length < 30) return match;
    return '[redacted]';
  });
  return r;
}

// ── HMAC verification ──

async function verifyHmac(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === signature.toLowerCase();
  } catch {
    return false;
  }
}

// ── Validation ──

const VALID_EVENT_TYPES = ['success', 'error', 'message', 'thinking', 'warning', 'incident', 'deploy'] as const;
const CHANNEL_KEY_REGEX = /^[0-9a-fA-F]{32}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ValidationResult {
  ok: boolean;
  error?: string;
  event?: {
    id: string;
    source: string;
    eventType: string;
    title: string;
    body?: string;
    tags?: string[];
    severity: number;
    timestamp: number;
    receivedAt: number;
  };
}

function validate(json: unknown): ValidationResult {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: 'Invalid payload structure' };
  }

  const obj = json as Record<string, unknown>;

  // Source
  if (typeof obj.source !== 'string' || obj.source.length === 0 || obj.source.length > 40) {
    return { ok: false, error: 'source: required string, max 40 chars' };
  }

  // EventType
  if (!VALID_EVENT_TYPES.includes(obj.eventType as typeof VALID_EVENT_TYPES[number])) {
    return { ok: false, error: `eventType: must be one of ${VALID_EVENT_TYPES.join(', ')}` };
  }

  // Title
  if (typeof obj.title !== 'string' || obj.title.length === 0 || obj.title.length > 80) {
    return { ok: false, error: 'title: required string, max 80 chars' };
  }

  // Body (optional)
  let body: string | undefined;
  if (obj.body !== undefined) {
    if (typeof obj.body !== 'string' || obj.body.length > 280) {
      return { ok: false, error: 'body: optional string, max 280 chars' };
    }
    body = obj.body;
  }

  // Tags (optional)
  let tags: string[] | undefined;
  if (obj.tags !== undefined) {
    if (!Array.isArray(obj.tags) || obj.tags.length > 8 || obj.tags.some((t: unknown) => typeof t !== 'string' || (t as string).length > 30)) {
      return { ok: false, error: 'tags: optional string[], max 8 items, each max 30 chars' };
    }
    tags = obj.tags as string[];
  }

  // Severity (optional, default 1)
  let severity = 1;
  if (obj.severity !== undefined) {
    if (typeof obj.severity !== 'number' || obj.severity < 0 || obj.severity > 3) {
      return { ok: false, error: 'severity: optional number 0-3' };
    }
    severity = obj.severity;
  }

  // Timestamp (optional)
  let timestamp = Date.now();
  if (obj.timestamp !== undefined) {
    if (typeof obj.timestamp !== 'number') {
      return { ok: false, error: 'timestamp: optional number' };
    }
    timestamp = obj.timestamp;
  }

  // Optional client-provided id (any UUID format, case-insensitive)
  let id: string;
  if (typeof obj.id === 'string' && UUID_REGEX.test(obj.id)) {
    id = obj.id.toLowerCase();
  } else {
    id = crypto.randomUUID();
  }

  const now = Date.now();

  const event = {
    id,
    source: redactField(obj.source as string),
    eventType: obj.eventType as string,
    title: redactField(obj.title as string),
    body: body ? redactField(body) : undefined,
    tags: tags?.map(t => redactField(t)),
    severity,
    timestamp,
    receivedAt: now,
  };

  return { ok: true, event };
}

// ── DB insert via REST API (service role, server-side only) ──

async function insertEvent(row: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return { ok: false, error: 'missing_config' };

  const res = await fetch(`${url}/rest/v1/ping_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

// ── Handler ──

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

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Channel key: header or query param
  const url = new URL(req.url);
  let channelKey = req.headers.get('x-ping-channel-key') ?? url.searchParams.get('key') ?? '';
  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return new Response(JSON.stringify({ ok: false, error: 'channel_key: required 32-char hex' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  channelKey = channelKey.toLowerCase();

  // Read body with size cap (2KB)
  const rawBody = await req.text();
  if (rawBody.length > 2048) {
    return new Response(JSON.stringify({ ok: false, error: 'Payload too large (max 2KB)' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authentication
  const secret = Deno.env.get('PING_INGEST_SECRET');
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const hmacSig = req.headers.get('x-ping-signature');
  const sharedSecret = req.headers.get('x-ping-secret');

  let authenticated = false;
  if (hmacSig) {
    authenticated = await verifyHmac(rawBody, hmacSig, secret);
  } else if (sharedSecret) {
    authenticated = sharedSecret === secret;
  }

  if (!authenticated) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse JSON
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate and normalize
  const result = validate(json);
  if (!result.ok || !result.event) {
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert into ping_events via REST API (service role, server-side only)
  const insertResult = await insertEvent({
    id: result.event.id,
    channel_key: channelKey,
    source: result.event.source,
    event_type: result.event.eventType,
    title: result.event.title,
    body: result.event.body ?? null,
    tags: result.event.tags ?? null,
    severity: result.event.severity,
    timestamp: result.event.timestamp,
    received_at: result.event.receivedAt,
  });

  if (!insertResult.ok) {
    console.error('insert_failed', insertResult.error);
    return new Response(JSON.stringify({ ok: false, error: 'insert_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log metadata only
  console.log(JSON.stringify({
    source: result.event.source,
    eventType: result.event.eventType,
    timestamp: result.event.timestamp,
    ip: truncateIp(ip),
  }));

  return new Response(JSON.stringify({ ok: true, id: result.event.id, event: result.event }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
