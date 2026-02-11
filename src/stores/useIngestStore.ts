/**
 * Ingest Store — Completely separate from usePingStore.
 * Manages webhook event ring buffer and secret configuration.
 * Secret is memory-only by default; opt-in persistence via "rememberSecret" toggle.
 */

import { create } from 'zustand';
import type { NormalizedEvent } from '@/lib/ingest/types';

const MAX_EVENTS = 200;
const STORAGE_KEY = 'ping-ingest-secret';

interface IngestState {
  events: NormalizedEvent[];
  lastEventAt: number | null;
  ingestSecret: string;
  rememberSecret: boolean;
  connected: boolean;
  showBodyPreview: boolean;

  pushEvent: (event: NormalizedEvent) => void;
  clearEvents: () => void;
  setSecret: (secret: string) => void;
  setRememberSecret: (value: boolean) => void;
  clearSecret: () => void;
  regenerateSecret: () => string;
  disconnect: () => void;
}

export const useIngestStore = create<IngestState>()((set, get) => ({
  events: [],
  lastEventAt: null,
  ingestSecret: (() => {
    // On init, check if a persisted secret exists
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  })(),
  rememberSecret: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  })(),
  connected: false,
  showBodyPreview: false,

  pushEvent: (event) =>
    set((s) => ({
      events: [event, ...s.events].slice(0, MAX_EVENTS),
      lastEventAt: Date.now(),
      connected: true,
    })),

  clearEvents: () => set({ events: [], lastEventAt: null }),

  setSecret: (secret) => {
    set({ ingestSecret: secret, connected: secret.length > 0 });
    if (get().rememberSecret) {
      try { localStorage.setItem(STORAGE_KEY, secret); } catch {}
    }
  },

  setRememberSecret: (value) => {
    set({ rememberSecret: value });
    if (value) {
      const secret = get().ingestSecret;
      if (secret) {
        try { localStorage.setItem(STORAGE_KEY, secret); } catch {}
      }
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  },

  clearSecret: () => {
    set({ ingestSecret: '', connected: false });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },

  regenerateSecret: () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const newSecret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    get().setSecret(newSecret);
    return newSecret;
  },

  disconnect: () => {
    set({ ingestSecret: '', connected: false, events: [], lastEventAt: null });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },
}));

/**
 * Get the ingest URL derived from Supabase project URL.
 */
export function getIngestUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/ingest`;
}
