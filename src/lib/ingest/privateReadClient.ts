/**
 * Private Read Client — Secure communication with read edge functions.
 *
 * - issueReadToken: POST to issue_read_token, returns token or null
 * - fetchEventsSecure: GET events_read with headers
 * - openSecureStream: EventSource to events_stream with query params;
 *   falls back to polling on error. Never includes token in error strings.
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
  let eventSource: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastSeen: number | undefined;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    onStatus(false);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
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

  // Try SSE first
  try {
    const sseUrl = `${base}/events-stream?key=${channelKey}&token=${readToken}`;
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      if (!cleaned) onStatus(true);
    };

    eventSource.addEventListener('ping', (e) => {
      if (cleaned) return;
      try {
        const evt = JSON.parse((e as MessageEvent).data) as NormalizedEvent;
        onEvent(evt);
        if (lastSeen === undefined || evt.receivedAt > lastSeen) {
          lastSeen = evt.receivedAt;
        }
      } catch {
        // Ignore malformed events
      }
    });

    eventSource.onerror = () => {
      if (cleaned) return;
      // Close SSE and fall back to polling
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      startPolling();
    };
  } catch {
    // EventSource failed to construct, fall back to polling
    startPolling();
  }

  return cleanup;
}
