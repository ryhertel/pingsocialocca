/**
 * Ingest Store — Completely separate from usePingStore.
 * Manages webhook event ring buffer, secret, channel key, and realtime status.
 * Secret is memory-only by default; opt-in persistence via "rememberSecret" toggle.
 * Channel key is always persisted (not sensitive — scopes event routing only).
 */

import { create } from 'zustand';
import type { NormalizedEvent } from '@/lib/ingest/types';

const MAX_EVENTS = 200;
const STORAGE_KEY = 'ping-ingest-secret';
const CHANNEL_KEY_STORAGE = 'ping-channel-key';

// Secret is stored in sessionStorage (scoped to the browser tab) rather than
// localStorage, so it is cleared on tab/window close and is not accessible
// to other tabs. Reduces XSS exfiltration risk for a sensitive write token.
const secretStore = {
  get(): string | null {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  },
  set(v: string) {
    try { sessionStorage.setItem(STORAGE_KEY, v); } catch {}
  },
  remove() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    // Clean up any legacy localStorage value from older versions.
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },
  // Migrate any pre-existing localStorage value into sessionStorage once,
  // then remove it from localStorage.
  migrate(): string | null {
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        try { sessionStorage.setItem(STORAGE_KEY, legacy); } catch {}
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        return legacy;
      }
    } catch {}
    return null;
  },
};

function generateChannelKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadOrCreateChannelKey(): string {
  try {
    const stored = localStorage.getItem(CHANNEL_KEY_STORAGE);
    if (stored && /^[0-9a-f]{32}$/.test(stored)) return stored;
    const key = generateChannelKey();
    localStorage.setItem(CHANNEL_KEY_STORAGE, key);
    return key;
  } catch {
    return generateChannelKey();
  }
}

interface IngestState {
  events: NormalizedEvent[];
  lastEventAt: number | null;
  ingestSecret: string;
  rememberSecret: boolean;
  connected: boolean;
  showBodyPreview: boolean;
  channelKey: string;
  realtimeConnected: boolean;
  readToken: string | null;
  secureStreamConnected: boolean;

  pushEvent: (event: NormalizedEvent) => void;
  clearEvents: () => void;
  setSecret: (secret: string) => void;
  setRememberSecret: (value: boolean) => void;
  clearSecret: () => void;
  regenerateSecret: () => string;
  disconnect: () => void;
  setChannelKey: (key: string) => void;
  regenerateChannelKey: () => string;
  setRealtimeConnected: (value: boolean) => void;
  setReadToken: (token: string | null) => void;
  setSecureStreamConnected: (value: boolean) => void;
}

export const useIngestStore = create<IngestState>()((set, get) => ({
  events: [],
  lastEventAt: null,
  ingestSecret: (() => {
    return secretStore.get() ?? secretStore.migrate() ?? '';
  })(),
  rememberSecret: (() => {
    try {
      return secretStore.get() !== null;
    } catch {
      return false;
    }
  })(),
  connected: false,
  showBodyPreview: false,
  channelKey: loadOrCreateChannelKey(),
  realtimeConnected: false,
  readToken: null,
  secureStreamConnected: false,

  pushEvent: (event) =>
    set((s) => {
      // Deduplicate by id
      if (s.events.some(e => e.id === event.id)) return s;
      return {
        events: [event, ...s.events].slice(0, MAX_EVENTS),
        lastEventAt: Date.now(),
        connected: true,
      };
    }),

  clearEvents: () => set({ events: [], lastEventAt: null }),

  setSecret: (secret) => {
    set({ ingestSecret: secret, connected: secret.length > 0 });
    if (get().rememberSecret) {
      secretStore.set(secret);
    }
  },

  setRememberSecret: (value) => {
    set({ rememberSecret: value });
    if (value) {
      const secret = get().ingestSecret;
      if (secret) {
        secretStore.set(secret);
      }
    } else {
      secretStore.remove();
    }
  },

  clearSecret: () => {
    set({ ingestSecret: '', connected: false });
    secretStore.remove();
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
    secretStore.remove();
  },

  setChannelKey: (key) => {
    const normalized = key.toLowerCase();
    set({ channelKey: normalized });
    try { localStorage.setItem(CHANNEL_KEY_STORAGE, normalized); } catch { /* storage unavailable */ }
  },

  regenerateChannelKey: () => {
    const newKey = generateChannelKey();
    get().setChannelKey(newKey);
    return newKey;
  },

  setRealtimeConnected: (value) => set({ realtimeConnected: value }),
  setReadToken: (token) => set({ readToken: token }),
  setSecureStreamConnected: (value) => set({ secureStreamConnected: value }),
}));

/**
 * Get the ingest URL derived from Supabase project URL.
 */
export function getIngestUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/ingest`;
}

/**
 * Get the ingest URL with channel key as query param.
 */
export function getIngestUrlWithKey(): string {
  const base = getIngestUrl();
  if (!base) return '';
  const channelKey = useIngestStore.getState().channelKey;
  return `${base}?key=${channelKey}`;
}
