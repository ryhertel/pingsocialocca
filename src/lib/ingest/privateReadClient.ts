/**
 * Private Read Client — Secure communication with the read edge functions.
 *
 * - claimChannel: POST claim-channel, returns a fresh channel and its tokens
 * - issueReadToken: POST issue-read-token, returns a token or null
 * - fetchEventsSecure: GET events_read with headers
 * - openSecureStream: fetch-based SSE reader to events_stream with headers;
 *   tokens are sent in request headers (never in the URL) to keep them out
 *   of server logs, browser history, and referrer leaks.
 *   Falls back to polling if streaming is unavailable, and re-mints the read
 *   token once on a 401 rather than degrading into a silent 401 loop.
 */

import type { NormalizedEvent } from '@/lib/ingest/types';

function getBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1`;
}

export interface ClaimedChannel {
  channelKey: string;
  writeToken: string;
  readToken: string;
}

/**
 * Mint a brand new channel with its own write and read tokens. No account, no
 * shared secret. The server always generates the channel key, so this can never
 * be used to take over an existing channel.
 */
export async function claimChannel(label?: string): Promise<ClaimedChannel | null> {
  const base = getBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/claim-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(label ? { label } : {}),
    });
    const data = await res.json();
    if (data.ok && typeof data.channelKey === 'string' && typeof data.writeToken === 'string' && typeof data.readToken === 'string') {
      return { channelKey: data.channelKey, writeToken: data.writeToken, readToken: data.readToken };
    }
    return null;
  } catch {
    return null;
  }
}

/** Proof of ownership for minting a read token: a channel write token, or the legacy global secret. */
export interface ReadTokenAuth {
  writeToken?: string;
  ingestSecret?: string;
}

export async function issueReadToken(
  channelKey: string,
  auth: ReadTokenAuth,
): Promise<string | null> {
  const base = getBaseUrl();
  if (!base) return null;
  if (!auth.writeToken && !auth.ingestSecret) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.writeToken) headers['x-ping-write-token'] = auth.writeToken;
  if (auth.ingestSecret) headers['x-ping-secret'] = auth.ingestSecret;

  try {
    const res = await fetch(`${base}/issue-read-token?key=${channelKey}`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (data.ok && typeof data.readToken === 'string') {
      return data.readToken;
    }
    return null;
  } catch {
    return null;
  }
}

interface ReadResult {
  status: number;
  events: NormalizedEvent[];
}

async function readEvents(
  channelKey: string,
  readToken: string,
  limit: number,
  since?: number,
): Promise<ReadResult> {
  const base = getBaseUrl();
  if (!base) return { status: 0, events: [] };

  try {
    let url = `${base}/events-read?limit=${limit}`;
    if (since !== undefined) {
      url += `&since=${since}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-ping-channel-key': channelKey,
        'x-ping-read-token': readToken,
      },
    });
    if (!res.ok) return { status: res.status, events: [] };
    const data = await res.json();
    if (data.ok && Array.isArray(data.events)) {
      return { status: res.status, events: data.events as NormalizedEvent[] };
    }
    return { status: res.status, events: [] };
  } catch {
    return { status: 0, events: [] };
  }
}

export async function fetchEventsSecure(
  channelKey: string,
  readToken: string,
  limit = 50,
  since?: number,
): Promise<NormalizedEvent[]> {
  const { events } = await readEvents(channelKey, readToken, limit, since);
  return events;
}

/** Called when the stored token is rejected; returns a replacement, or null. */
export type TokenRenewer = () => Promise<string | null>;

export function openSecureStream(
  channelKey: string,
  readToken: string,
  onEvent: (event: NormalizedEvent) => void,
  onStatus: (connected: boolean) => void,
  renewToken?: TokenRenewer,
): () => void {
  const base = getBaseUrl();
  if (!base) {
    onStatus(false);
    return () => {};
  }

  let cleaned = false;
  let abortController: AbortController | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastSeen: number | undefined;
  let activeToken = readToken;
  let renewals = 0;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    onStatus(false);
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  /**
   * Re-mint once on rejection. Without this a wiped or rotated token leaves the
   * client in a polling loop that 401s forever while reporting "connected".
   */
  const tryRenew = async (): Promise<boolean> => {
    if (cleaned || !renewToken || renewals >= 1) return false;
    renewals++;
    const fresh = await renewToken();
    if (!fresh) return false;
    activeToken = fresh;
    return true;
  };

  // Fallback: poll events_read every 3s
  const startPolling = () => {
    if (cleaned || pollTimer) return;
    onStatus(true);

    pollTimer = setInterval(async () => {
      if (cleaned) {
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      const { status, events } = await readEvents(channelKey, activeToken, 50, lastSeen);
      if (status === 401) {
        onStatus(false);
        if (await tryRenew()) {
          onStatus(true);
        } else if (pollTimer) {
          // Nothing more we can do; stop claiming to be connected.
          clearInterval(pollTimer);
          pollTimer = null;
        }
        return;
      }
      // events_read returns newest first; replay oldest first so the feed order holds.
      for (let i = events.length - 1; i >= 0; i--) {
        const evt = events[i];
        onEvent(evt);
        if (lastSeen === undefined || evt.receivedAt > lastSeen) {
          lastSeen = evt.receivedAt;
        }
      }
    }, 3000);
  };

  // fetch-based SSE reader — token travels in a header, never the URL.
  // This keeps it out of server access logs, browser history, and referrer headers.
  const startFetchSSE = async () => {
    abortController = new AbortController();
    const sseUrl = `${base}/events-stream`;

    try {
      const res = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'x-ping-channel-key': channelKey,
          'x-ping-read-token': activeToken,
        },
        signal: abortController.signal,
      });

      if (res.status === 401 && await tryRenew()) {
        if (!cleaned) startFetchSSE();
        return;
      }

      if (!res.ok || !res.body) {
        // Server doesn't support streaming — fall back to polling
        startPolling();
        return;
      }

      if (!cleaned) onStatus(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      const processLine = (line: string) => {
        // SSE data lines look like: "data: {...}"
        if (!line.startsWith('data:')) return;
        const json = line.slice(5).trim();
        if (!json || json === '[DONE]') return;
        try {
          const evt = JSON.parse(json) as NormalizedEvent;
          onEvent(evt);
          if (lastSeen === undefined || evt.receivedAt > lastSeen) {
            lastSeen = evt.receivedAt;
          }
        } catch {
          // Ignore malformed events
        }
      };

      // Stream loop
      while (!cleaned) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buf.split(/\n\n/);
        buf = parts.pop() ?? '';
        for (const block of parts) {
          for (const line of block.split('\n')) {
            processLine(line.trim());
          }
        }
      }

      // Stream ended gracefully — fall back to polling to stay live
      if (!cleaned) startPolling();
    } catch {
      if (cleaned) return; // Expected on cleanup abort
      // Stream failed — fall back to polling
      startPolling();
    }
  };

  startFetchSSE();

  return cleanup;
}
