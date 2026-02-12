/**
 * Realtime Subscription — Subscribes to ping_events INSERT via Supabase Realtime.
 *
 * ISOLATION RULE: This module imports only from supabase/client, useIngestStore,
 * reactionRouter, reactionExecutor, and ingest types.
 * It must NOT import bridge.ts, usePingStore messages, or OpenClaw modules.
 */

import { supabase } from '@/integrations/supabase/client';
import { useIngestStore } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import type { NormalizedEvent, IngestEventType } from '@/lib/ingest/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

let activeChannel: RealtimeChannel | null = null;

function mapRowToEvent(row: Record<string, unknown>): NormalizedEvent {
  return {
    id: row.id as string,
    source: row.source as string,
    eventType: row.event_type as IngestEventType,
    title: row.title as string,
    body: (row.body as string) ?? undefined,
    tags: (row.tags as string[]) ?? undefined,
    severity: row.severity as number,
    timestamp: Number(row.timestamp),
    receivedAt: Number(row.received_at),
  };
}

export function subscribeToEvents(channelKey: string): void {
  // Clean up any existing subscription
  unsubscribeFromEvents();

  const channel = supabase
    .channel('ping-events:' + channelKey)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ping_events',
        filter: `channel_key=eq.${channelKey}`,
      },
      (payload) => {
        const event = mapRowToEvent(payload.new as Record<string, unknown>);
        const store = useIngestStore.getState();
        store.pushEvent(event);
        const reaction = routeEvent(event);
        executeReaction(reaction);
      },
    )
    .subscribe((status) => {
      const store = useIngestStore.getState();
      store.setRealtimeConnected(status === 'SUBSCRIBED');
    });

  activeChannel = channel;
}

export function unsubscribeFromEvents(): void {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
  useIngestStore.getState().setRealtimeConnected(false);
}

export async function fetchRecentEvents(channelKey: string, limit = 50): Promise<void> {
  const { data, error } = await supabase
    .from('ping_events')
    .select('*')
    .eq('channel_key', channelKey)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return;

  const store = useIngestStore.getState();
  // Push in reverse so oldest first, newest on top (pushEvent prepends)
  for (let i = data.length - 1; i >= 0; i--) {
    store.pushEvent(mapRowToEvent(data[i] as Record<string, unknown>));
  }
}
