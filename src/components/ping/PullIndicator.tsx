import { RefreshCw } from 'lucide-react';

interface PullIndicatorProps {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

export function PullIndicator({ pulling, pullDistance, refreshing, threshold }: PullIndicatorProps) {
  if (!pulling && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = refreshing ? undefined : progress * 180;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${refreshing ? 20 : pullDistance}px)` }}
    >
      <div
        className={`rounded-full bg-muted/80 backdrop-blur-sm p-2 shadow-lg ${
          refreshing ? 'animate-spin' : ''
        }`}
        style={rotation !== undefined ? { transform: `rotate(${rotation}deg)` } : undefined}
      >
        <RefreshCw
          className={`h-5 w-5 ${
            progress >= 1 ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
      </div>
    </div>
  );
}
