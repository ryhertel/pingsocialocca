import { useRef, useEffect } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { cn } from '@/lib/utils';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}

export function ChatStack() {
  const messages = usePingStore((s) => s.messages);
  const displayed = messages.slice(-20);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayed.length, displayed[displayed.length - 1]?.revealedText]);

  if (displayed.length === 0) return null;

  return (
    <div className="absolute bottom-20 right-4 w-72 sm:w-80 max-h-[50vh] z-10">
      <div ref={scrollRef} className="overflow-y-auto space-y-1.5 pr-1">
        {displayed.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'text-xs rounded-xl px-3 py-2 backdrop-blur-sm',
              msg.role === 'user'
                ? 'bg-muted/50 ml-10 text-foreground'
                : 'bg-muted/25 mr-6 text-muted-foreground',
            )}
          >
            <p className="leading-relaxed">
              {msg.isRevealing ? msg.revealedText || '…' : msg.text}
            </p>
            <span className="text-[10px] opacity-40 mt-0.5 block">
              {formatRelative(msg.ts)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
