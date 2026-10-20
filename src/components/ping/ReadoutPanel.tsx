import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIngestStore, getIngestUrlWithKey, getIngestAuthHeaders, getWebhookUrl } from '@/stores/useIngestStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import { fetchRecentEventsSecure } from '@/lib/ingest/realtime';
import type { NormalizedEvent } from '@/lib/ingest/types';
import { EmailInCard } from './EmailInCard';
import { cn } from '@/lib/utils';

/**
 * The event log, set like an instrument printout: one aligned row per event with
 * a millisecond timestamp, its source, its type and a three-step severity bar.
 * Press a row to replay its reaction. Below it sit the channel's two inputs.
 */

const ROWS = 40;
const SOURCE_FILTERS = 4;
/** A row stays highlighted this long after it arrives, so new events catch the eye. */
const FRESH_MS = 6000;

const TYPE_TONE: Record<string, string> = {
  success: 'text-primary',
  deploy: 'text-primary',
  error: 'text-[hsl(var(--ping-error))]',
  incident: 'text-[hsl(var(--ping-error))]',
  warning: 'text-[hsl(var(--ping-warning))]',
  thinking: 'text-[hsl(var(--ping-warning))]',
};

const BAR_TONE: Record<string, string> = {
  error: 'bg-[hsl(var(--ping-error))]',
  incident: 'bg-[hsl(var(--ping-error))]',
  warning: 'bg-[hsl(var(--ping-warning))]',
  thinking: 'bg-[hsl(var(--ping-warning))]',
};

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function SeverityBar({ event }: { event: NormalizedEvent }) {
  const level = Math.max(0, Math.min(3, Math.round(event.severity)));
  const on = BAR_TONE[event.eventType] ?? 'bg-primary';
  return (
    <span className="flex gap-0.5" aria-label={`severity ${level} of 3`}>
      {[1, 2, 3].map((step) => (
        <span key={step} className={cn('h-3 w-1.5 rounded-sm', step <= level ? on : 'bg-foreground/10')} />
      ))}
    </span>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy. Select the text and copy it instead.');
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-1.5 pl-3">
        <code className="flex-1 min-w-0 truncate font-mono text-xs text-foreground select-text">{value}</code>
        <Button size="sm" onClick={copy} className="h-8 gap-1.5 shrink-0" aria-label={`Copy ${label.toLowerCase()}`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

export function ReadoutPanel({ onClaim, className }: { onClaim: () => void; className?: string }) {
  const events = useIngestStore((s) => s.events);
  const channelKey = useIngestStore((s) => s.channelKey);
  const readToken = useIngestStore((s) => s.readToken);
  const writeToken = useIngestStore((s) => s.writeToken);
  const secureStreamConnected = useIngestStore((s) => s.secureStreamConnected);
  const pushEvent = useIngestStore((s) => s.pushEvent);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const unlock = useSettingsStore((s) => s.unlock);

  const [source, setSource] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const claimed = writeToken.length > 0;

  // Backfill on mount, so the log is not empty just because the page reloaded.
  useEffect(() => {
    if (channelKey && readToken) fetchRecentEventsSecure(channelKey, readToken);
  }, [channelKey, readToken]);

  // Re-render while something is fresh, so its highlight fades on time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, SOURCE_FILTERS).map(([s]) => s);
  }, [events]);

  // A filter for a source that has scrolled out of the buffer would show nothing forever.
  const activeSource = source && sources.includes(source) ? source : null;
  // Sorted, not taken in arrival order: the backfill on load lands after any
  // event the stream already delivered, which put the newest row at the bottom.
  const rows = useMemo(
    () => (activeSource ? events.filter((e) => e.source === activeSource) : [...events])
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, ROWS),
    [events, activeSource],
  );

  const sendTest = async () => {
    const url = getIngestUrlWithKey();
    if (!url) return;
    setSending(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getIngestAuthHeaders() },
        body: JSON.stringify({ source: 'ping', eventType: 'message', title: 'Hello from Ping' }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || 'Test event failed');
      } else if (!secureStreamConnected && data.event) {
        // The stream would normally deliver it; show it here so the press is not silent.
        pushEvent(data.event);
        executeReaction(routeEvent(data.event));
      }
    } catch {
      toast.error('Could not reach Ping. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  if (isLocked) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card', className)}>
        <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground">Readout locked</p>
        <Button size="sm" variant="outline" onClick={unlock}>Unlock</Button>
      </div>
    );
  }

  return (
    <section aria-label="Readout" className={cn('flex flex-col min-h-0 overflow-hidden rounded-3xl border border-border/60 bg-card', className)}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold">Readout</h2>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        {sources.length > 1 && (
          <div className="flex gap-1 font-mono text-[11px] overflow-x-auto" role="group" aria-label="Filter by source">
            {[null, ...sources].map((s) => (
              <button
                key={s ?? 'all'}
                type="button"
                onClick={() => setSource(s)}
                aria-pressed={activeSource === s}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeSource === s ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s ?? 'all'}
              </button>
            ))}
          </div>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">NO EVENTS YET</span>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            {claimed
              ? 'Point a webhook or an email at your channel below. Events land here the moment they arrive.'
              : 'Make it yours to get a webhook URL and an email address. Events you send will print here.'}
          </p>
          {!claimed && <Button onClick={onClaim} className="mt-1">Make it mine</Button>}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="sticky top-0 z-[1] grid grid-cols-[100px_64px_64px_32px_minmax(0,1fr)] gap-x-3 px-5 py-2.5 bg-card border-b border-border/40 font-mono text-[10px] tracking-[0.12em] text-muted-foreground/80">
            <span>TIME</span><span>SOURCE</span><span>TYPE</span><span>SEV</span><span>TITLE</span>
          </div>
          <ol>
            {rows.map((e) => {
              const fresh = now - e.receivedAt < FRESH_MS;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => executeReaction(routeEvent(e))}
                    title="Replay this reaction"
                    className={cn(
                      'grid w-full grid-cols-[100px_64px_64px_32px_minmax(0,1fr)] items-center gap-x-3 px-5 py-3 text-left border-b border-border/30 font-mono text-xs tabular-nums transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:bg-foreground/[0.06]',
                      fresh && 'bg-primary/[0.07]',
                    )}
                  >
                    <span className={fresh ? 'text-primary' : 'text-muted-foreground'}>{clockTime(e.receivedAt)}</span>
                    <span className="truncate text-foreground/80">{e.source}</span>
                    <span className={cn('truncate', TYPE_TONE[e.eventType] ?? 'text-foreground/80')}>{e.eventType}</span>
                    <SeverityBar event={e} />
                    <span className="truncate font-sans text-[13px] text-foreground select-text">{e.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {claimed && (
        <footer className="flex flex-col gap-4 px-5 py-4 border-t border-border/60">
          <CopyRow label="WEBHOOK" value={getWebhookUrl()} />
          <EmailInCard compact />
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground/80">
              TITLES REDACTED SERVER-SIDE
            </span>
            <Button size="sm" variant="outline" onClick={sendTest} disabled={sending} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {sending ? 'Sending…' : 'Send test event'}
            </Button>
          </div>
        </footer>
      )}
    </section>
  );
}
