import { create } from 'zustand';
import type { PersistentState, TransientReaction, ChatMessage, BridgeStatus, DiagnosticsEntry } from '@/lib/types';

let notifyCoalesceTimerId: number | null = null;
let reactionTimerId: number | null = null;

interface PingState {
  persistentState: PersistentState;
  transientReaction: TransientReaction;
  messages: ChatMessage[];
  bridgeStatus: BridgeStatus;
  diagnosticsLog: DiagnosticsEntry[];
  notifyBadgeCount: number;
  isComposerFocused: boolean;
  lastError: string | null;
  lastEventTs: number | null;

  setPersistentState: (state: PersistentState) => void;
  triggerReaction: (reaction: 'success' | 'notify') => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessageReveal: (id: string, revealedText: string) => void;
  finishReveal: (id: string) => void;
  setBridgeStatus: (status: Partial<BridgeStatus>) => void;
  addDiagnosticsEntry: (entry: DiagnosticsEntry) => void;
  setIsComposerFocused: (focused: boolean) => void;
  setLastError: (error: string | null) => void;
  updateLastEventTs: () => void;
  clearMessages: () => void;
}

export const usePingStore = create<PingState>()((set, get) => ({
  persistentState: 'disconnected',
  transientReaction: null,
  messages: [],
  bridgeStatus: { connected: false },
  diagnosticsLog: [],
  notifyBadgeCount: 0,
  isComposerFocused: false,
  lastError: null,
  lastEventTs: null,

  setPersistentState: (persistentState) => set({ persistentState }),

  triggerReaction: (reaction) => {
    if (reaction === 'notify') {
      const current = get().notifyBadgeCount;
      // Only fire animation for the first notify in the coalesce window
      if (current === 0) {
        set({ transientReaction: 'notify' });
        if (reactionTimerId) clearTimeout(reactionTimerId);
        reactionTimerId = window.setTimeout(() => {
          set({ transientReaction: null });
        }, 500);
      }
      set({ notifyBadgeCount: current + 1 });
      // Reset coalesce window (6–10s)
      if (notifyCoalesceTimerId) clearTimeout(notifyCoalesceTimerId);
      notifyCoalesceTimerId = window.setTimeout(() => {
        set({ notifyBadgeCount: 0 });
        notifyCoalesceTimerId = null;
      }, 8000);
    } else if (reaction === 'success') {
      set({ transientReaction: 'success' });
      if (reactionTimerId) clearTimeout(reactionTimerId);
      reactionTimerId = window.setTimeout(() => {
        set({ transientReaction: null });
      }, 1000);
    }
  },

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages.slice(-49), msg] })),

  updateMessageReveal: (id, revealedText) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, revealedText } : m)),
    })),

  finishReveal: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, isRevealing: false, revealedText: m.text } : m,
      ),
    })),

  setBridgeStatus: (status) =>
    set((s) => ({ bridgeStatus: { ...s.bridgeStatus, ...status } })),

  addDiagnosticsEntry: (entry) =>
    set((s) => ({ diagnosticsLog: [...s.diagnosticsLog.slice(-99), entry] })),

  setIsComposerFocused: (isComposerFocused) => set({ isComposerFocused }),
  setLastError: (lastError) => set({ lastError }),
  updateLastEventTs: () => set({ lastEventTs: Date.now() }),
  clearMessages: () => set({ messages: [] }),
}));
