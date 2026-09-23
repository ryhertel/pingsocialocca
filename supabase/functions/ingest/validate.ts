/**
 * Validation and normalization for the ingest endpoint.
 *
 * Two modes, because the two callers have different failure options:
 *
 *   strict  — a native Ping payload. The sender controls its own JSON and can fix
 *             a 400, so limits are errors. This is the documented contract.
 *   lenient — adapter output. The sender is GitHub or Stripe; it cannot rewrite
 *             its payload in response to a 400, and a rejected delivery means an
 *             endless provider retry loop. So we truncate, clamp and coerce, and
 *             report what we changed. An adapter bug must produce a slightly
 *             wrong event, never a dropped one.
 *
 * Pure and dependency-free so it runs under both Deno and vitest. IDs are not
 * generated here — the caller owns crypto.
 */

import { redact } from './redact.ts';

export const VALID_EVENT_TYPES = ['success', 'error', 'message', 'thinking', 'warning', 'incident', 'deploy'] as const;

export type PingEventType = typeof VALID_EVENT_TYPES[number];

/** Stored field limits. Raised from 80/280/8x30 to fit real provider payloads. */
export const LIMITS = {
  source: 40,
  title: 120,
  body: 500,
  tags: 8,
  tagLength: 40,
} as const;

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidatedEvent {
  /** Only set when the caller supplied a well-formed UUID; otherwise the caller assigns one. */
  id?: string;
  source: string;
  eventType: PingEventType;
  title: string;
  body?: string;
  tags?: string[];
  severity: number;
  timestamp: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  event?: ValidatedEvent;
  /** Lenient-mode repairs, surfaced in the 200 response so senders can see them. */
  warnings?: string[];
}

export type ValidationMode = 'strict' | 'lenient';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Redaction never lengthens text, so capping the raw value also caps the result. */
function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

export function validate(
  json: unknown,
  mode: ValidationMode = 'strict',
  now: number = Date.now(),
): ValidationResult {
  const lenient = mode === 'lenient';
  const warnings: string[] = [];

  if (!isPlainObject(json)) {
    return { ok: false, error: 'Invalid payload structure' };
  }

  // ── source ──
  let source: string;
  if (typeof json.source === 'string' && json.source.length > 0 && json.source.length <= LIMITS.source) {
    source = json.source;
  } else if (lenient) {
    source = typeof json.source === 'string' && json.source.length > 0
      ? truncate(json.source, LIMITS.source)
      : 'unknown';
    warnings.push('source normalized');
  } else {
    return { ok: false, error: `source: required string, max ${LIMITS.source} chars` };
  }

  // ── eventType ──
  let eventType: PingEventType;
  if (VALID_EVENT_TYPES.includes(json.eventType as PingEventType)) {
    eventType = json.eventType as PingEventType;
  } else if (lenient) {
    eventType = 'message';
    warnings.push('eventType coerced to message');
  } else {
    return { ok: false, error: `eventType: must be one of ${VALID_EVENT_TYPES.join(', ')}` };
  }

  // ── title ──
  let title: string;
  if (typeof json.title === 'string' && json.title.length > 0 && json.title.length <= LIMITS.title) {
    title = json.title;
  } else if (lenient) {
    title = typeof json.title === 'string' && json.title.length > 0
      ? truncate(json.title, LIMITS.title)
      : 'Untitled event';
    warnings.push('title truncated');
  } else {
    return { ok: false, error: `title: required string, max ${LIMITS.title} chars` };
  }

  // ── body ──
  let body: string | undefined;
  if (json.body !== undefined) {
    if (typeof json.body === 'string' && json.body.length <= LIMITS.body) {
      body = json.body;
    } else if (lenient) {
      body = typeof json.body === 'string' ? truncate(json.body, LIMITS.body) : undefined;
      warnings.push('body truncated');
    } else {
      return { ok: false, error: `body: optional string, max ${LIMITS.body} chars` };
    }
  }

  // ── tags ──
  let tags: string[] | undefined;
  if (json.tags !== undefined) {
    const raw = json.tags;
    const valid = Array.isArray(raw)
      && raw.length <= LIMITS.tags
      && raw.every((t) => typeof t === 'string' && t.length <= LIMITS.tagLength);
    if (valid) {
      tags = raw as string[];
    } else if (lenient) {
      tags = Array.isArray(raw)
        ? raw.filter((t): t is string => typeof t === 'string')
            .slice(0, LIMITS.tags)
            .map((t) => truncate(t, LIMITS.tagLength))
        : undefined;
      warnings.push('tags trimmed');
    } else {
      return { ok: false, error: `tags: optional string[], max ${LIMITS.tags} items, each max ${LIMITS.tagLength} chars` };
    }
  }

  // ── severity ──
  let severity = 1;
  if (json.severity !== undefined) {
    const n = json.severity;
    if (typeof n === 'number' && !Number.isNaN(n) && n >= 0 && n <= 3) {
      severity = Math.round(n);
    } else if (lenient) {
      severity = typeof n === 'number' && !Number.isNaN(n)
        ? Math.max(0, Math.min(3, Math.round(n)))
        : 1;
      warnings.push('severity clamped');
    } else {
      return { ok: false, error: 'severity: optional number 0-3' };
    }
  }

  // ── timestamp ──
  let timestamp = now;
  if (json.timestamp !== undefined) {
    if (typeof json.timestamp === 'number' && Number.isFinite(json.timestamp)) {
      timestamp = json.timestamp;
    } else if (lenient) {
      warnings.push('timestamp defaulted');
    } else {
      return { ok: false, error: 'timestamp: optional number' };
    }
  }

  // ── id (optional; the caller assigns one when absent) ──
  const id = typeof json.id === 'string' && UUID_REGEX.test(json.id)
    ? json.id.toLowerCase()
    : undefined;

  const event: ValidatedEvent = {
    id,
    source: redact(source),
    eventType,
    title: redact(title),
    body: body ? redact(body) : undefined,
    tags: tags?.map((t) => redact(t)),
    severity,
    timestamp,
  };

  return warnings.length > 0 ? { ok: true, event, warnings } : { ok: true, event };
}
