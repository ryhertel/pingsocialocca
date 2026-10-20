import { useEffect, useState } from 'react';
import { useIngestStore } from '@/stores/useIngestStore';
import { cn } from '@/lib/utils';

/**
 * The app's status line, in the same mono as the readout. Every value is live
 * state, never decoration: whether the stream is up, which channel this is, and
 * how long since anything arrived.
 */

function sinceLabel(ts: number | null, now: number): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export function StatusReadings({ className }: { className?: string }) {
  const streamUp = useIngestStore((s) => s.secureStreamConnected);
  const channelKey = useIngestStore((s) => s.channelKey);
  const writeToken = useIngestStore((s) => s.writeToken);
  const lastEventAt = useIngestStore((s) => s.lastEventAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn('items-center gap-6 font-mono text-[11px] tracking-[0.06em] text-muted-foreground', className)}>
      <span className="flex items-center gap-2">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', streamUp ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]' : 'bg-muted-foreground/50')}
          aria-hidden="true"
        />
        STREAM <span className="text-foreground">{streamUp ? 'live' : 'offline'}</span>
      </span>
      {writeToken && (
        <span>
          CHANNEL <span className="text-foreground">{channelKey.slice(0, 4)}••••</span>
        </span>
      )}
      <span>
        LAST EVENT <span className="text-foreground tabular-nums">{sinceLabel(lastEventAt, now)}</span>
      </span>
    </div>
  );
}
