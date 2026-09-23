/**
 * Ingest Store — Completely separate from usePingStore.
 * Manages webhook event ring buffer, credentials, channel key, and stream status.
 *
 * Two different credentials live here, and conflating them would be a real
 * hazard, so they are stored under different keys:
 *
 *   ingestSecret  the legacy global server secret. Grants write access to every
 *                 channel, so it stays in sessionStorage (tab-scoped, cleared on
 *                 close) and is never put in a URL.
 *   writeToken    a per-channel token minted by claim-channel. Scoped to one
 *                 channel, so it is safe to place in a webhook URL — which is
 *                 required, because GitHub, Stripe, Vercel, Sentry and Linear
 *                 cannot send custom headers. Persisted in localStorage next to
 *                 the read token so every tab shares one set.
 *
 * Channel key is always persisted (not sensitive — scopes event routing only).
 */

import { create } from 'zustand';
import type { NormalizedEvent } from '@/lib/ingest/types';

const MAX_EVENTS = 200;
const STORAGE_KEY = 'ping-ingest-secret';
const CHANNEL_KEY_STORAGE = 'ping-channel-key';
const CREDENTIALS_STORAGE = 'ping-channel-credentials';

// Secret is stored in sessionStorage (scoped to the browser tab) rather than
// localStorage, so it is cleared on tab/window close and is not accessible
// to other tabs. Reduces XSS exfiltration risk for a sensitive write token.
const secretStore = {
  get(): string | null {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  },
  set(v: string) {
    try { sessionStorage.setItem(STORAGE_KEY, v); } catch { /* storage unavailable */ }
  },
  remove() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    // Clean up any legacy localStorage value from older versions.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  },
  // Migrate any pre-existing localStorage value into sessionStorage once,
  // then remove it from localStorage.
  migrate(): string | null {
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        try { sessionStorage.setItem(STORAGE_KEY, legacy); } catch { /* storage unavailable */ }
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
        return legacy;
      }
    } catch { /* storage unavailable */ }
    return null;
  },
};

interface StoredCredentials {
  channelKey: string;
  writeToken: string;
  readToken: string;
  /** Local part of the inbound email address. Empty when email-in is unavailable. */
  emailAlias: string;
}

/**
 * Per-channel tokens, shared across tabs on purpose: the read token has exactly
 * one stored hash server-side, so a per-tab token would mean each new tab
 * invalidated the last one.
 */
const credentialStore = {
  load(channelKey: string): { writeToken: string; readToken: string; emailAlias: string } | null {
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredCredentials;
      // Tokens are only meaningful for the channel they were minted for.
      if (!parsed || parsed.channelKey !== channelKey) return null;
      return {
        writeToken: parsed.writeToken ?? '',
        readToken: parsed.readToken ?? '',
        emailAlias: parsed.emailAlias ?? '',
      };
    } catch {
      return null;
    }
  },
  save(credentials: StoredCredentials) {
    try { localStorage.setItem(CREDENTIALS_STORAGE, JSON.stringify(credentials)); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(CREDENTIALS_STORAGE); } catch { /* storage unavailable */ }
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

const initialChannelKey = loadOrCreateChannelKey();
const initialCredentials = credentialStore.load(initialChannelKey);

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
  writeToken: string;
  emailAlias: string;
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
  setWriteToken: (token: string) => void;
  setEmailAlias: (alias: string) => void;
  /** Adopt a freshly claimed channel and its tokens in one atomic step. */
  adoptChannel: (credentials: StoredCredentials) => void;
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
  channelKey: initialChannelKey,
  realtimeConnected: false,
  readToken: initialCredentials?.readToken || null,
  writeToken: initialCredentials?.writeToken ?? '',
  emailAlias: initialCredentials?.emailAlias ?? '',
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
    set({ ingestSecret: '', connected: false, events: [], lastEventAt: null, readToken: null, writeToken: '', emailAlias: '' });
    secretStore.remove();
    credentialStore.clear();
  },

  setChannelKey: (key) => {
    const normalized = key.toLowerCase();
    const previous = get().channelKey;
    set({ channelKey: normalized });
    try { localStorage.setItem(CHANNEL_KEY_STORAGE, normalized); } catch { /* storage unavailable */ }
    // Tokens and the email address belong to the channel they were minted for.
    if (previous !== normalized) {
      set({ readToken: null, writeToken: '', emailAlias: '' });
      credentialStore.clear();
    }
  },

  regenerateChannelKey: () => {
    const newKey = generateChannelKey();
    get().setChannelKey(newKey);
    return newKey;
  },

  setRealtimeConnected: (value) => set({ realtimeConnected: value }),

  setReadToken: (token) => {
    set({ readToken: token });
    const { channelKey, writeToken, emailAlias } = get();
    if (token) {
      credentialStore.save({ channelKey, writeToken, readToken: token, emailAlias });
    }
  },

  setWriteToken: (token) => {
    set({ writeToken: token });
    const { channelKey, readToken, emailAlias } = get();
    credentialStore.save({ channelKey, writeToken: token, readToken: readToken ?? '', emailAlias });
  },

  setEmailAlias: (alias) => {
    set({ emailAlias: alias });
    const { channelKey, writeToken, readToken } = get();
    credentialStore.save({ channelKey, writeToken, readToken: readToken ?? '', emailAlias: alias });
  },

  adoptChannel: ({ channelKey, writeToken, readToken, emailAlias }) => {
    const normalized = channelKey.toLowerCase();
    try { localStorage.setItem(CHANNEL_KEY_STORAGE, normalized); } catch { /* storage unavailable */ }
    credentialStore.save({ channelKey: normalized, writeToken, readToken, emailAlias });
    set({
      channelKey: normalized,
      writeToken,
      readToken,
      emailAlias,
      connected: true,
      events: [],
      lastEventAt: null,
    });
  },

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

/**
 * The full webhook URL, token included, for pasting into a provider that cannot
 * send custom headers. Falls back to the key-only URL when no token is claimed.
 */
export function getWebhookUrl(): string {
  const base = getIngestUrlWithKey();
  if (!base) return '';
  const writeToken = useIngestStore.getState().writeToken;
  return writeToken ? `${base}&t=${writeToken}` : base;
}

/** True once this browser holds per-channel credentials rather than the global secret. */
export function hasClaimedChannel(): boolean {
  const { writeToken, readToken } = useIngestStore.getState();
  return writeToken.length > 0 && !!readToken;
}

/**
 * Auth headers for writing to the ingest endpoint. Prefers the per-channel write
 * token; falls back to the legacy global secret for channels that predate it.
 */
export function getIngestAuthHeaders(): Record<string, string> {
  const { writeToken, ingestSecret } = useIngestStore.getState();
  if (writeToken) return { 'x-ping-write-token': writeToken };
  if (ingestSecret) return { 'x-ping-secret': ingestSecret };
  return {};
}

/** Whether this browser holds any credential that can post events. */
export function canSendEvents(): boolean {
  const { writeToken, ingestSecret } = useIngestStore.getState();
  return writeToken.length > 0 || ingestSecret.length > 0;
}
