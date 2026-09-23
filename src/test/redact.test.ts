import { describe, it, expect } from 'vitest';
import { redact } from '../../supabase/functions/ingest/redact.ts';

describe('redact — removes secrets', () => {
  it('replaces code fences', () => {
    expect(redact('before ```const k = 1``` after')).toBe('before [code] after');
  });

  it('replaces URLs', () => {
    expect(redact('see https://example.com/a/b?c=d now')).toBe('see [link] now');
  });

  it('replaces attachment references', () => {
    expect(redact('got [attachment: secret.png] here')).toBe('got [attachment] here');
  });

  it('replaces an API-key-shaped run', () => {
    expect(redact('key ghp16C7e42F292c6912E7710c838347Ae178B4a')).toBe('key [redacted]');
  });

  it('replaces a full commit SHA', () => {
    expect(redact('at a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')).toBe('at [redacted]');
  });
});

describe('redact — leaves ordinary text alone', () => {
  it('keeps a repo path that is long but has no digits', () => {
    // The old rule redacted this, which destroyed every GitHub adapter title.
    expect(redact('ryhertel/pingsocialocca')).toBe('ryhertel/pingsocialocca');
  });

  it('keeps a short commit SHA', () => {
    expect(redact('commit a1b2c3d shipped')).toBe('commit a1b2c3d shipped');
  });

  it('keeps a hyphenated branch name', () => {
    expect(redact('branch feature/add-provider-adapters')).toBe('branch feature/add-provider-adapters');
  });

  it('keeps an ordinary sentence', () => {
    const text = 'ryhertel pushed 2 commits to ryhertel/pingsocialocca main';
    expect(redact(text)).toBe(text);
  });
});

describe('redact — does not enforce length', () => {
  it('leaves long text at full length so stored and searchable text agree', () => {
    const long = 'word '.repeat(60).trim();
    expect(redact(long).length).toBe(long.length);
  });
});
