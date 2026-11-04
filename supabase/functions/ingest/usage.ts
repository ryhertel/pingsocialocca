/**
 * Shared hourly budgets, backed by the database.
 *
 * The in-memory limiter in index.ts is per instance and forgets everything on a
 * restart, so on its own it cannot cap what one channel or one address can write
 * in a day. These budgets live in Postgres (ping_rate_hit), so every instance
 * counts against the same number.
 *
 * Advisory in one direction only: if the database cannot be reached the request
 * is allowed, because a monitoring tool that drops real events when its counter
 * is down is worse than one that briefly under-limits.
 */

/** Events one channel may receive per hour. Real senders run far below this. */
export const CHANNEL_EVENTS_PER_HOUR = 1_200;
/** Requests one address may make per hour across all channels. */
export const IP_REQUESTS_PER_HOUR = 3_000;
const HOUR_SECONDS = 3_600;

export interface UsageConfig {
  url: string;
  key: string;
}

/** True while `bucket` is inside its hourly limit; counts this call against it. */
export async function withinHourlyBudget(
  config: UsageConfig,
  bucket: string,
  limit: number,
  doFetch: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await doFetch(`${config.url}/rest/v1/rpc/ping_rate_hit`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_bucket: bucket, p_window_seconds: HOUR_SECONDS, p_limit: limit }),
    });
    if (!res.ok) return true;
    return (await res.json()) !== false;
  } catch {
    return true;
  }
}
