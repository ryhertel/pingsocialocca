import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemePreset, AnimationIntensity, ConnectionMode, AutoLockMinutes } from '@/lib/types';
import { themePresets } from '@/lib/themes';

interface SettingsState {
  displayName: string;
  theme: ThemePreset;
  animationIntensity: AnimationIntensity;
  muted: boolean;
  volume: number;
  idleChirps: boolean;
  dnd: boolean;
  connectionMode: ConnectionMode;
  bridgeUrl: string;
  privacyLock: boolean;
  autoLockMinutes: AutoLockMinutes;
  isLocked: boolean;

  setDisplayName: (name: string) => void;
  setTheme: (theme: ThemePreset) => void;
  setAnimationIntensity: (intensity: AnimationIntensity) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setIdleChirps: (enabled: boolean) => void;
  setDnd: (dnd: boolean) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setBridgeUrl: (url: string) => void;
  setPrivacyLock: (enabled: boolean) => void;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  lock: () => void;
  unlock: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayName: 'Ping',
      theme: 'mint',
      animationIntensity: 'medium',
      muted: false,
      volume: 0.7,
      idleChirps: false,
      dnd: false,
      connectionMode: 'demo',
      bridgeUrl: 'ws://127.0.0.1:3939/ping',
      privacyLock: false,
      autoLockMinutes: 15,
      isLocked: false,

      setDisplayName: (displayName) => set({ displayName }),
      setTheme: (theme) => set({ theme }),
      setAnimationIntensity: (animationIntensity) => set({ animationIntensity }),
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume }),
      setIdleChirps: (idleChirps) => set({ idleChirps }),
      setDnd: (dnd) => set({ dnd }),
      setConnectionMode: (connectionMode) => set({ connectionMode }),
      setBridgeUrl: (bridgeUrl) => set({ bridgeUrl }),
      setPrivacyLock: (privacyLock) => set({ privacyLock }),
      setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),
    }),
    {
      name: 'ping-settings',
      partialize: (state) => ({
        displayName: state.displayName,
        theme: state.theme,
        animationIntensity: state.animationIntensity,
        muted: state.muted,
        volume: state.volume,
        idleChirps: state.idleChirps,
        dnd: state.dnd,
        connectionMode: state.connectionMode,
        bridgeUrl: state.bridgeUrl,
        privacyLock: state.privacyLock,
        autoLockMinutes: state.autoLockMinutes,
      }),
    },
  ),
);

// Apply theme glow colors to CSS custom properties
function applyThemeToCSS() {
  const { theme } = useSettingsStore.getState();
  const preset = themePresets[theme];
  const toSpaced = (s: string) => s.replace(/,\s*/g, ' ');
  const root = document.documentElement;
  root.style.setProperty('--glow-primary', toSpaced(preset.glowPrimary));
  root.style.setProperty('--glow-secondary', toSpaced(preset.glowSecondary));
  root.style.setProperty('--ping-accent', toSpaced(preset.accent));
  root.style.setProperty('--primary', toSpaced(preset.glowPrimary));
  root.style.setProperty('--ring', toSpaced(preset.glowPrimary));
  root.style.setProperty('--accent', toSpaced(preset.accent));
}

if (typeof document !== 'undefined') {
  setTimeout(applyThemeToCSS, 0);
  useSettingsStore.subscribe((state, prev) => {
    if (state.theme !== prev.theme) applyThemeToCSS();
  });
}
