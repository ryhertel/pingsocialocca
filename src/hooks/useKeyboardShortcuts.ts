import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface ShortcutHandlers {
  onSettings?: () => void;
  onShortcutsHelp?: () => void;
}

export function useKeyboardShortcuts({ onSettings, onShortcutsHelp }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      switch (e.key) {
        case 'm': {
          const s = useSettingsStore.getState();
          s.setMuted(!s.muted);
          break;
        }
        case 'd': {
          const s = useSettingsStore.getState();
          s.setDnd(!s.dnd);
          break;
        }
        case 's':
          e.preventDefault();
          onSettings?.();
          break;
        case '/': {
          e.preventDefault();
          const composer = document.querySelector<HTMLTextAreaElement>('[data-composer-input]');
          composer?.focus();
          break;
        }
        case 'Escape':
          // Let Radix handle Escape for its own dialogs
          break;
        case '?':
          onShortcutsHelp?.();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSettings, onShortcutsHelp]);
}
