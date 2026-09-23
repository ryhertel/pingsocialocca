/**
 * Ingest Edge Function — webhook endpoint for external events.
 *
 * Pipeline: rate limit → size cap → authenticate → parse → adapt → validate
 *           (+redact) → insert. The secure read stream delivers to the UI.
 *
 * Adaptation is what makes Ping general-purpose: a raw GitHub, Stripe or Vercel
 * webhook is mapped to Ping's shape here, so nothing in between is needed.
 * A payload nothing recognises falls through to strict validation and the same
 * 400 as before.
 *
 * Auth is per-channel. A channel that has claimed a write token can only be
 * written with that token; the legacy global secret is accepted only for
 * channels that never claimed one, so old integrations keep working while every
 * new channel is closed to cross-channel writes from day one.
 *
 * SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.
 */

import { adaptRequest } from './adapters.ts';
import { validate } from './validate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ping-signature, x-ping-secret, x-ping-channel-key, x-ping-write-token, x-ping-source',
};

// ── Limits ──

/** Raw inbound cap. Real provider payloads run 10-60KB; 2KB rejected all of them. */
const MAX_RAW_BYTES = 98_304; // 96KB

// ── Rate limiting (in-memory, per-instance: advisory, not a hard limit) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
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

// ── Crypto helpers (constant-time, mirroring events-read/events-stream) ──

const CHANNEL_KEY_REGEX = /^[0-9a-fA-F]{32}$/;
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

/** Compare two secrets by digest, so timing is independent of length and prefix. */
async function secretsMatch(a: string, b: string): Promise<boolean> {
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
    const a = hexToBytes(computed);
    const b = hexToBytes(signature.trim().toLowerCase());
    if (!a || !b || a.length !== 32 || b.length !== 32) return false;
    return constantTimeEqual(a, b);
  } catch {
    return false;
  }
}

/** Derive a stable UUID from a provider's delivery id so retries collapse to one row. */
async function uuidFromKey(key: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  const hex = Array.from(digest.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ── Database ──

function serviceConfig(): { url: string; key: string } | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return { url, key };
}

/** Returns the channel's stored write-token hash, or null when it never claimed one. */
async function fetchWriteTokenHash(channelKey: string): Promise<string | null> {
  const config = serviceConfig();
  if (!config) return null;
  try {
    const res = await fetch(
      `${config.url}/rest/v1/ping_channels?channel_key=eq.${channelKey}&select=write_token_hash`,
      { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const hash = rows[0]?.write_token_hash;
    return typeof hash === 'string' ? hash : null;
  } catch {
    return null;
  }
}

async function insertEvent(row: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const config = serviceConfig();
  if (!config) return { ok: false, error: 'missing_config' };

  const res = await fetch(`${config.url}/rest/v1/ping_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    // A duplicate primary key is a provider replaying a delivery we already stored.
    // Reporting 500 here would make it retry forever, so treat it as success.
    if (res.status === 409 || text.includes('23505')) return { ok: true };
    return { ok: false, error: text };
  }
  return { ok: true };
}

// ── Responses ──

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return json(429, { ok: false, error: 'Rate limit exceeded' });
  }

  // Channel key: header or query param
  const url = new URL(req.url);
  let channelKey = req.headers.get('x-ping-channel-key') ?? url.searchParams.get('key') ?? '';
  if (!CHANNEL_KEY_REGEX.test(channelKey)) {
    return json(400, { ok: false, error: 'channel_key: required 32-char hex' });
  }
  channelKey = channelKey.toLowerCase();

  if (!checkRateLimit(`ch:${channelKey}`)) {
    return new Response(JSON.stringify({ ok: false, error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  // Size cap: reject on the declared length before buffering, then verify the
  // real byte count (a chunked request can lie about Content-Length).
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RAW_BYTES) {
    return json(413, { ok: false, error: `Payload too large (max ${MAX_RAW_BYTES >> 10}KB)` });
  }
  const buffer = new Uint8Array(await req.arrayBuffer());
  if (buffer.byteLength > MAX_RAW_BYTES) {
    return json(413, { ok: false, error: `Payload too large (max ${MAX_RAW_BYTES >> 10}KB)` });
  }
  // Keep the exact string: HMAC verification needs the bytes as sent.
  const rawBody = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  // ── Authentication ──
  //  1. per-channel write token (header or ?t=)
  //  2. legacy global secret or its HMAC, accepted only for a channel that never
  //     claimed a token. Provider-native HMAC (GitHub, Stripe) lands in R3.
  const writeToken = (req.headers.get('x-ping-write-token') ?? url.searchParams.get('t') ?? '').toLowerCase();
  const hmacSig = req.headers.get('x-ping-signature');
  const sharedSecret = req.headers.get('x-ping-secret');
  const globalSecret = Deno.env.get('PING_INGEST_SECRET');

  const writeTokenHash = await fetchWriteTokenHash(channelKey);

  let authenticated = false;
  let authMode = 'none';

  if (writeToken && await tokenMatchesHash(writeToken, writeTokenHash)) {
    authenticated = true;
    authMode = 'channel_token';
  } else if (hmacSig && writeTokenHash === null && globalSecret && await verifyHmac(rawBody, hmacSig, globalSecret)) {
    authenticated = true;
    authMode = 'legacy_hmac';
  } else if (sharedSecret && writeTokenHash === null && globalSecret && await secretsMatch(sharedSecret, globalSecret)) {
    authenticated = true;
    authMode = 'legacy_global';
  }

  if (!authenticated) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  // ── Adapt provider payloads to the native shape ──
  const headers: Record<string, string> = {};
  for (const [key, value] of req.headers) headers[key.toLowerCase()] = value;

  let adapted: ReturnType<typeof adaptRequest> = null;
  try {
    adapted = adaptRequest({
      headers,
      query: Object.fromEntries(url.searchParams),
      body: parsed,
    });
  } catch {
    adapted = null;
  }

  if (adapted?.result?.kind === 'ack') {
    return json(200, adapted.result.body);
  }
  if (adapted?.result?.kind === 'ignore') {
    return json(200, { ok: true, ignored: adapted.result.reason });
  }

  const isAdapted = adapted?.result?.kind === 'event';
  const payload = isAdapted && adapted?.result?.kind === 'event' ? adapted.result.event : parsed;

  // Validate and normalize. Adapter output is repaired rather than rejected,
  // because the sender is a provider that cannot respond to a 400.
  const result = validate(payload, isAdapted ? 'lenient' : 'strict');
  if (!result.ok || !result.event) {
    return json(400, { ok: false, error: result.error });
  }

  // Stable id from the provider's delivery id, so a retry lands on the same row.
  let id = result.event.id;
  if (!id && isAdapted && adapted?.result?.kind === 'event' && adapted.result.event.dedupeKey) {
    id = await uuidFromKey(`${channelKey}:${adapted.id}:${adapted.result.event.dedupeKey}`);
  }
  if (!id) id = crypto.randomUUID();

  const receivedAt = Date.now();

  const insertResult = await insertEvent({
    id,
    channel_key: channelKey,
    source: result.event.source,
    event_type: result.event.eventType,
    title: result.event.title,
    body: result.event.body ?? null,
    tags: result.event.tags ?? null,
    severity: result.event.severity,
    timestamp: result.event.timestamp,
    received_at: receivedAt,
  });

  if (!insertResult.ok) {
    console.error('insert_failed', insertResult.error);
    return json(500, { ok: false, error: 'insert_failed' });
  }

  // Metadata only — never the URL, which may carry the write token.
  console.log(JSON.stringify({
    source: result.event.source,
    eventType: result.event.eventType,
    adapter: adapted?.id ?? 'native',
    auth: authMode,
    deprecated: authMode.startsWith('legacy') || undefined,
    timestamp: result.event.timestamp,
    ip: truncateIp(ip),
  }));

  const event = { ...result.event, id, receivedAt };
  return json(200, result.warnings ? { ok: true, id, event, warnings: result.warnings } : { ok: true, id, event });
});
