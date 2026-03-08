import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import type { PersistentState } from '@/lib/types';

const stateLabels: Record<PersistentState, string> = {
  disconnected: 'Disconnected',
  idle: 'Idle',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Error',
};

export function StatusChip() {
  const state = usePingStore((s) => s.persistentState);
  const badgeCount = usePingStore((s) => s.notifyBadgeCount);
  const theme = useSettingsStore((s) => s.theme);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const preset = themePresets[theme];

  if (isLocked) {
    return (
      <div
        className="relative px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(170,180,194,0.12)', color: '#AAB4C2' }}
      >
        Locked
      </div>
    );
  }

  let bg: string, fg: string;
  switch (state) {
    case 'disconnected':
      bg = 'rgba(170,180,194,0.12)';
      fg = '#AAB4C2';
      break;
    case 'idle':
    case 'speaking':
      bg = `hsla(${preset.glowPrimary}, 0.12)`;
      fg = `hsl(${preset.glowPrimary})`;
      break;
    case 'thinking':
      bg = 'rgba(255,176,32,0.12)';
      fg = '#FFB020';
      break;
    case 'error':
      bg = 'rgba(255,59,59,0.12)';
      fg = '#FF3B3B';
      break;
  }

  return (
    <div
      data-tour="status"
      className="relative px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-sm"
      style={{ backgroundColor: bg, color: fg }}
    >
      {stateLabels[state]}
      {badgeCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: fg, color: '#080B10' }}
        >
          {badgeCount}
        </span>
      )}
    </div>
  );
}
