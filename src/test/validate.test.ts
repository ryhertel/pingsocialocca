import { describe, it, expect } from 'vitest';
import { validate, LIMITS } from '../../supabase/functions/ingest/validate.ts';

const native = { source: 'curl', eventType: 'success', title: 'Hello from Ping' };

/** Realistic long text: an unbroken 120-char run would read as a token and be redacted. */
const words = (length: number) => 'word '.repeat(Math.ceil(length / 5)).slice(0, length);

describe('validate — strict mode (native payloads)', () => {
  it('accepts a minimal native payload', () => {
    const result = validate(native, 'strict');
    expect(result.ok).toBe(true);
    expect(result.event!.severity).toBe(1);
    expect(result.warnings).toBeUndefined();
  });

  it('rejects a title over the limit rather than silently trimming it', () => {
    const result = validate({ ...native, title: 'x'.repeat(LIMITS.title + 1) }, 'strict');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('title');
  });

  it('rejects an unknown eventType', () => {
    const result = validate({ ...native, eventType: 'explosion' }, 'strict');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('eventType');
  });

  it('rejects severity outside 0-3', () => {
    expect(validate({ ...native, severity: 7 }, 'strict').ok).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(validate('nope', 'strict').ok).toBe(false);
    expect(validate([1, 2], 'strict').ok).toBe(false);
    expect(validate(null, 'strict').ok).toBe(false);
  });

  it('accepts the widened limits that used to fail at 80 and 280', () => {
    const result = validate({ ...native, title: words(100), body: words(400) }, 'strict');
    expect(result.ok).toBe(true);
  });
});

describe('validate — lenient mode (adapter output)', () => {
  it('truncates an over-long title instead of rejecting it', () => {
    const result = validate({ ...native, title: words(LIMITS.title + 50) }, 'lenient');
    expect(result.ok).toBe(true);
    expect(result.event!.title.length).toBe(LIMITS.title);
    expect(result.event!.title.endsWith('…')).toBe(true);
    expect(result.warnings).toContain('title truncated');
  });

  it('clamps severity rather than rejecting it', () => {
    expect(validate({ ...native, severity: 7 }, 'lenient').event!.severity).toBe(3);
    expect(validate({ ...native, severity: -4 }, 'lenient').event!.severity).toBe(0);
  });

  it('coerces an unknown eventType to message', () => {
    const result = validate({ ...native, eventType: 'explosion' }, 'lenient');
    expect(result.event!.eventType).toBe('message');
    expect(result.warnings).toContain('eventType coerced to message');
  });

  it('trims a tag list that is too long or too deep', () => {
    const result = validate({ ...native, tags: Array(12).fill('t'.repeat(60)) }, 'lenient');
    expect(result.event!.tags!.length).toBe(LIMITS.tags);
    expect(result.event!.tags!.every((t) => t.length <= LIMITS.tagLength)).toBe(true);
  });

  it('never rejects an adapter payload that is missing everything', () => {
    const result = validate({}, 'lenient');
    expect(result.ok).toBe(true);
    expect(result.event!.title).toBe('Untitled event');
    expect(result.event!.source).toBe('unknown');
  });
});

describe('validate — normalization', () => {
  it('redacts URLs and secrets in stored fields', () => {
    const result = validate({ ...native, title: 'Deploy done', body: 'see https://example.com/x' }, 'strict');
    expect(result.event!.body).toContain('[link]');
  });

  it('keeps a client-supplied UUID and leaves id unset otherwise', () => {
    const withId = validate({ ...native, id: '4F8C5E10-1A2B-4C3D-9E8F-000000000001' }, 'strict');
    expect(withId.event!.id).toBe('4f8c5e10-1a2b-4c3d-9e8f-000000000001');
    expect(validate({ ...native, id: 'not-a-uuid' }, 'strict').event!.id).toBeUndefined();
  });

  it('defaults the timestamp to the supplied clock', () => {
    expect(validate(native, 'strict', 1234).event!.timestamp).toBe(1234);
  });
});
