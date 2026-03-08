import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useIngestStore } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import type { NormalizedEvent } from '@/lib/ingest/types';
import { fetchRecentEventsSecure } from '@/lib/ingest/realtime';
import { Trash2, Search, X } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

interface EventFeedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400',
  error: 'bg-red-500/20 text-red-400',
  message: 'bg-blue-500/20 text-blue-400',
  thinking: 'bg-yellow-500/20 text-yellow-400',
  warning: 'bg-orange-500/20 text-orange-400',
  incident: 'bg-red-600/20 text-red-500',
  deploy: 'bg-purple-500/20 text-purple-400',
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function EventRow({ event }: { event: NormalizedEvent }) {
  const showBody = useIngestStore((s) => s.showBodyPreview);

  const handleReplay = () => {
    const reaction = routeEvent(event);
    executeReaction(reaction);
  };

  return (
    <button
      onClick={handleReplay}
      className="w-full text-left p-2 rounded-lg hover:bg-muted/30 transition-colors space-y-1"
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${TYPE_COLORS[event.eventType] ?? ''}`}>
          {event.eventType}
        </Badge>
        <span className="text-[10px] text-muted-foreground truncate flex-1">{event.source}</span>
        <span className="text-[9px] text-muted-foreground/60 shrink-0">{relativeTime(event.receivedAt)}</span>
      </div>
      <p className="text-xs text-foreground truncate">{event.title}</p>
      {showBody && event.body && (
        <p className="text-[10px] text-muted-foreground truncate">{event.body}</p>
      )}
    </button>
  );
}

export function EventFeed({ open, onOpenChange }: EventFeedProps) {
  const events = useIngestStore((s) => s.events);
  const clearEvents = useIngestStore((s) => s.clearEvents);
  const channelKey = useIngestStore((s) => s.channelKey);
  const secureStreamConnected = useIngestStore((s) => s.secureStreamConnected);
  const readToken = useIngestStore((s) => s.readToken);

  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    if (open && channelKey && readToken) {
      fetchRecentEventsSecure(channelKey, readToken);
    }
  }, [open, channelKey, readToken]);

  const allTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.eventType));
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    let filtered = events.slice(0, 50);
    if (activeType) {
      filtered = filtered.filter((e) => e.eventType === activeType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          (e.body && e.body.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [events, search, activeType]);

  const displayEvents = filteredEvents.slice(0, 20);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-[320px] sm:w-[360px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-semibold">Event Feed</SheetTitle>
            {events.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearEvents} className="text-xs gap-1 h-7">
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by source, type, keyword…"
              className="h-8 pl-8 pr-8 text-xs bg-muted/40 border-border/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type filter chips */}
          {allTypes.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveType(null)}
                className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                  !activeType
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {allTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(activeType === t ? null : t)}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                    activeType === t
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {/* Realtime indicator */}
          <div className="flex items-center gap-2 pb-2">
            <div className={`h-2 w-2 rounded-full ${secureStreamConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-[10px] text-muted-foreground">
              {secureStreamConnected ? 'Secure stream connected' : 'Secure stream disconnected'}
            </span>
          </div>

          {displayEvents.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-muted-foreground">No events yet</p>
              <p className="text-[10px] text-muted-foreground/60">
                Use "Send Test Event" in the Webhooks panel or Connectors page to get started.
              </p>
            </div>
          ) : (
            <>
              {displayEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
              <p className="text-[9px] text-muted-foreground/50 text-center pt-2">
                Click any event to replay its reaction.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
