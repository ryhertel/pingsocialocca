/**
 * Realtime — Secure stream for ping_events via edge functions.
 *
 * Replaces direct Supabase Realtime subscription with SSE/polling
 * through authenticated edge functions.
 *
 * ISOLATION RULE: This module imports only from useIngestStore,
 * reactionRouter, reactionExecutor, ingest types, and privateReadClient.
 * It must NOT import bridge.ts, usePingStore messages, or OpenClaw modules.
 */

import { useIngestStore } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import { openSecureStream, fetchEventsSecure, issueReadToken } from '@/lib/ingest/privateReadClient';
import type { NormalizedEvent } from '@/lib/ingest/types';

let cleanupFn: (() => void) | null = null;

/**
 * Re-mint the read token after the server rejects the stored one — a rotation,
 * a wipe, or another device having taken the single stored hash. Ownership is
 * proved with the channel write token, falling back to the legacy global secret.
 */
async function renewReadToken(channelKey: string): Promise<string | null> {
  const store = useIngestStore.getState();
  const fresh = await issueReadToken(channelKey, {
    writeToken: store.writeToken || undefined,
    ingestSecret: store.ingestSecret || undefined,
  });
  if (fresh) store.setReadToken(fresh);
  return fresh;
}

export function startSecureStream(channelKey: string, readToken: string): void {
  // Clean up any existing stream
  stopSecureStream();

  cleanupFn = openSecureStream(
    channelKey,
    readToken,
    (event: NormalizedEvent) => {
      const store = useIngestStore.getState();
      store.pushEvent(event);
      const reaction = routeEvent(event);
      executeReaction(reaction);
    },
    (connected: boolean) => {
      useIngestStore.getState().setSecureStreamConnected(connected);
    },
    () => renewReadToken(channelKey),
  );
}

export function stopSecureStream(): void {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
  useIngestStore.getState().setSecureStreamConnected(false);
}

export async function fetchRecentEventsSecure(
  channelKey: string,
  readToken: string,
  limit = 50,
): Promise<void> {
  const events = await fetchEventsSecure(channelKey, readToken, limit);
  const store = useIngestStore.getState();
  // Push in reverse so oldest first, newest on top (pushEvent prepends)
  for (let i = events.length - 1; i >= 0; i--) {
    store.pushEvent(events[i]);
  }
}
