import { describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_EVENTS_PER_HOUR,
  IP_REQUESTS_PER_HOUR,
  withinHourlyBudget,
} from '../../supabase/functions/ingest/usage';

/**
 * The hourly budgets are what stop one sender, or a flood of them, from turning
 * into database cost. These pin the contract: count against the shared counter,
 * refuse past the limit, and never drop real events because the counter is down.
 */

const config = { url: 'https://db.example.co', key: 'service-key' };
const reply = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body } as Response);

describe('withinHourlyBudget', () => {
  it('allows a call the database says is inside the limit', async () => {
    const doFetch = reply(true);
    expect(await withinHourlyBudget(config, 'ch:abc', 100, doFetch)).toBe(true);
  });

  it('refuses a call the database says is over the limit', async () => {
    expect(await withinHourlyBudget(config, 'ch:abc', 100, reply(false))).toBe(false);
  });

  it('counts against the shared counter with the right bucket, window and limit', async () => {
    const doFetch = reply(true);
    await withinHourlyBudget(config, 'ip:1.2.3.4', 3000, doFetch);
    const [url, init] = doFetch.mock.calls[0];
    expect(url).toBe('https://db.example.co/rest/v1/rpc/ping_rate_hit');
    expect(JSON.parse(init.body)).toEqual({ p_bucket: 'ip:1.2.3.4', p_window_seconds: 3600, p_limit: 3000 });
    expect(init.headers.Authorization).toBe('Bearer service-key');
  });

  it('fails open when the database errors, so real events are never dropped', async () => {
    expect(await withinHourlyBudget(config, 'ch:abc', 100, reply({}, false))).toBe(true);
    expect(await withinHourlyBudget(config, 'ch:abc', 100, vi.fn().mockRejectedValue(new Error('down')))).toBe(true);
  });
});

describe('budget sizes', () => {
  it('leave real senders alone: well above a busy integration, finite for a flood', () => {
    // 1,200 an hour is 20 a minute, sustained, for one channel.
    expect(CHANNEL_EVENTS_PER_HOUR).toBeGreaterThanOrEqual(600);
    expect(CHANNEL_EVENTS_PER_HOUR).toBeLessThanOrEqual(5_000);
    // A shared office address can legitimately carry several channels.
    expect(IP_REQUESTS_PER_HOUR).toBeGreaterThan(CHANNEL_EVENTS_PER_HOUR);
  });
});
