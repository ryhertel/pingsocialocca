import { useEffect, useCallback, useRef } from 'react';

const FLUSH_INTERVAL = 5_000;
const MAX_BATCH = 15;
const ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/analytics`;

interface AnalyticsEvent {
  event_name: string;
  page?: string;
  referrer?: string;
  screen_w?: number;
  screen_h?: number;
}

let queue: AnalyticsEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify(batch);

  // Use sendBeacon for reliability (page unload), fall back to fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, body);
  } else {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

function enqueue(event: AnalyticsEvent) {
  queue.push(event);
  if (queue.length >= MAX_BATCH) flush();
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(flush, FLUSH_INTERVAL);
  // Flush on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

/**
 * Lightweight self-hosted analytics hook.
 * Tracks page_view on mount and exposes a `track` function for custom events.
 */
export function useAnalytics() {
  const tracked = useRef(false);

  useEffect(() => {
    ensureTimer();
    if (tracked.current) return;
    tracked.current = true;

    enqueue({
      event_name: 'page_view',
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
    });
  }, []);

  const track = useCallback((eventName: string, extra?: { page?: string }) => {
    enqueue({
      event_name: eventName,
      page: extra?.page ?? window.location.pathname,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
    });
  }, []);

  return { track };
}
