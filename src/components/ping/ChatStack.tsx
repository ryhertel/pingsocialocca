import { useRef, useEffect } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}

export function ChatStack() {
  const messages = usePingStore((s) => s.messages);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const unlock = useSettingsStore((s) => s.unlock);
  const displayed = messages.slice(-20);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayed.length, displayed[displayed.length - 1]?.revealedText]);

  if (displayed.length === 0 && !isLocked) return null;

  if (isLocked) {
    return (
      <div className="absolute bottom-20 right-4 w-72 sm:w-80 z-10">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 backdrop-blur-md px-6 py-8 text-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Session Locked</p>
          <Button
            size="sm"
            variant="outline"
            onClick={unlock}
            className="text-xs"
          >
            Unlock
          </Button>
        </div>
      </div>
    );
  }

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
