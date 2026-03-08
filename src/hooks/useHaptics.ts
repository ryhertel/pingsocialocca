import { useCallback } from 'react';

type HapticPattern = 'tap' | 'success' | 'warning' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [30, 20, 30, 20, 30],
};

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Lightweight haptic feedback using the Vibration API.
 * Falls back silently on unsupported browsers.
 */
export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern = 'tap') => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Silently fail
    }
  }, []);

  return { vibrate };
}
