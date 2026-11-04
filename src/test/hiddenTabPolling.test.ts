import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIDDEN_GRACE_MS, openSecureStream } from '@/lib/ingest/privateReadClient';

/**
 * A dashboard left in a background tab used to keep the server polling the
 * database for it indefinitely. It now pauses once the tab has been hidden for a
 * while, and on return fetches what it missed (once, in order) and reconnects.
 */

const KEY = '0123456789abcdef0123456789abcdef';
const TOKEN = 'a'.repeat(64);

let eventsToReturn: Array<{ id: string; receivedAt: number }> = [];
let calls: string[] = [];

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.co');
  calls = [];
  eventsToReturn = [];
  // The stream is unavailable, so the client uses its polling path.
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes('/events-stream')) return { ok: false, status: 500 } as Response;
    return { ok: true, status: 200, json: async () => ({ ok: true, events: eventsToReturn }) } as Response;
  }));
  setHidden(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const reads = () => calls.filter((u) => u.includes('/events-read')).length;
const streams = () => calls.filter((u) => u.includes('/events-stream')).length;

describe('hidden-tab pause', () => {
  it('stops polling once the tab has been hidden past the grace period', async () => {
    const stop = openSecureStream(KEY, TOKEN, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(6_000);
    expect(reads()).toBeGreaterThan(0);

    setHidden(true);
    await vi.advanceTimersByTimeAsync(HIDDEN_GRACE_MS + 1_000);
    const paused = reads();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(reads()).toBe(paused);
    stop();
  });

  it('keeps going through a short glance away', async () => {
    const stop = openSecureStream(KEY, TOKEN, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(3_100);
    setHidden(true);
    await vi.advanceTimersByTimeAsync(10_000);
    setHidden(false);
    const before = reads();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(reads()).toBeGreaterThan(before);
    expect(streams()).toBe(1); // never reconnected
    stop();
  });

  it('on return, fetches what it missed once, in order, then reconnects', async () => {
    const seen: string[] = [];
    const stop = openSecureStream(KEY, TOKEN, (e) => seen.push(e.id), vi.fn());
    await vi.advanceTimersByTimeAsync(1_000);

    setHidden(true);
    await vi.advanceTimersByTimeAsync(HIDDEN_GRACE_MS + 1_000);
    const streamsBefore = streams();

    // events_read returns newest first.
    eventsToReturn = [
      { id: 'newer', receivedAt: Date.now() + 2 },
      { id: 'older', receivedAt: Date.now() + 1 },
    ];
    setHidden(false);
    await vi.advanceTimersByTimeAsync(0);

    expect(seen).toEqual(['older', 'newer']);
    expect(calls.filter((u) => u.includes('since=')).length).toBeGreaterThan(0);
    expect(streams()).toBe(streamsBefore + 1);
    stop();
  });

  it('does nothing further after the stream is stopped', async () => {
    const stop = openSecureStream(KEY, TOKEN, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(1_000);
    stop();
    const total = calls.length;
    setHidden(true);
    await vi.advanceTimersByTimeAsync(HIDDEN_GRACE_MS * 3);
    setHidden(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls.length).toBe(total);
  });
});
