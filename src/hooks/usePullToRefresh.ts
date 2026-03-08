import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
}

/**
 * Pull-to-refresh hook for mobile. Attaches to a scrollable container ref.
 * Only activates when scrolled to the top.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  });
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.refreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [disabled, state.refreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current) return;
      const dy = Math.max(0, e.touches[0].clientY - startY.current);
      // Apply resistance
      const distance = Math.min(dy * 0.5, threshold * 1.5);
      if (distance > 5) {
        setState((s) => ({ ...s, pulling: true, pullDistance: distance }));
      }
    },
    [threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (state.pullDistance >= threshold) {
      setState((s) => ({ ...s, refreshing: true, pullDistance: 0, pulling: false }));
      try {
        await onRefresh();
      } catch {
        // ignore
      }
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    }
  }, [state.pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, ...state };
}
