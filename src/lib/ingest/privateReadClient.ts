/**
 * Private Read Client — Secure communication with read edge functions.
 *
 * - issueReadToken: POST to issue_read_token, returns token or null
 * - fetchEventsSecure: GET events_read with headers
 * - openSecureStream: fetch-based SSE reader to events_stream with headers;
 *   tokens are sent in request headers (never in the URL) to keep them out
 *   of server logs, browser history, and referrer leaks.
 *   Falls back to polling if streaming is unavailable.
 */

import type { NormalizedEvent } from '@/lib/ingest/types';

function getBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1`;
}

export async function issueReadToken(
  channelKey: string,
  ingestSecret: string,
): Promise<string | null> {
  const base = getBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/issue-read-token?key=${channelKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ping-secret': ingestSecret,
      },
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

export async function fetchEventsSecure(
  channelKey: string,
  readToken: string,
  limit = 50,
  since?: number,
): Promise<NormalizedEvent[]> {
  const base = getBaseUrl();
  if (!base) return [];

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
    const data = await res.json();
    if (data.ok && Array.isArray(data.events)) {
      return data.events as NormalizedEvent[];
    }
    return [];
  } catch {
    return [];
  }
}

export function openSecureStream(
  channelKey: string,
  readToken: string,
  onEvent: (event: NormalizedEvent) => void,
  onStatus: (connected: boolean) => void,
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

  // Fallback: poll events_read every 3s
  const startPolling = () => {
    if (cleaned || pollTimer) return;
    onStatus(true);

    pollTimer = setInterval(async () => {
      if (cleaned) {
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      try {
        const events = await fetchEventsSecure(channelKey, readToken, 50, lastSeen);
        for (const evt of events) {
          onEvent(evt);
          if (lastSeen === undefined || evt.receivedAt > lastSeen) {
            lastSeen = evt.receivedAt;
          }
        }
      } catch {
        // Continue polling
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
          'x-ping-read-token': readToken,
        },
        signal: abortController.signal,
      });

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
    } catch (err) {
      if (cleaned) return; // Expected on cleanup abort
      // Stream failed — fall back to polling
      startPolling();
    }
  };

  startFetchSSE();

  return cleanup;
}
