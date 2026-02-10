import { useRef, useEffect, useState, useCallback } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Lock, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}

const NEAR_BOTTOM_THRESHOLD = 120;

interface ChatStackProps {
  hidden?: boolean;
}

export function ChatStack({ hidden }: ChatStackProps) {
  const messages = usePingStore((s) => s.messages);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const unlock = useSettingsStore((s) => s.unlock);
  const theme = useSettingsStore((s) => s.theme);
  const displayed = messages.slice(-20);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const prevLengthRef = useRef(displayed.length);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const glowPrimary = themePresets[theme].glowPrimary;

  const assistantBgStyle = {
    backgroundColor: `hsla(${glowPrimary}, 0.10)`,
    borderLeft: `2px solid hsla(${glowPrimary}, 0.5)`,
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    isNearBottom.current = nearBottom;
    setShowJumpButton(!nearBottom && displayed.length > 0);
  }, [displayed.length]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  }, []);

  const jumpToLatest = useCallback(() => {
    scrollToBottom('smooth');
    setShowJumpButton(false);
  }, [scrollToBottom]);

  useEffect(() => {
    if (!isNearBottom.current) return;
    const isNewMessage = displayed.length !== prevLengthRef.current;
    prevLengthRef.current = displayed.length;
    scrollToBottom(isNewMessage ? 'smooth' : 'auto');
  }, [displayed.length, displayed[displayed.length - 1]?.revealedText, scrollToBottom]);

  if (hidden) return null;

  if (displayed.length === 0 && !isLocked) return null;

  if (isLocked) {
    return (
      <div className="absolute bottom-2 right-4 left-4 sm:left-auto w-auto sm:w-80 z-10">
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
    <div className="absolute bottom-2 right-4 left-4 sm:left-auto sm:w-80 max-h-[40vh] sm:max-h-[60vh] z-10">
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-y-auto max-h-[40vh] sm:max-h-[60vh]"
          onScroll={handleScroll}
        >
          <div className="space-y-1.5 pr-1 pb-16">
            {displayed.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'text-sm sm:text-xs rounded-xl px-3 py-2 backdrop-blur-sm max-w-[78vw] sm:max-w-none',
                  msg.role === 'user'
                    ? 'bg-muted/50 ml-10 text-foreground'
                    : 'mr-6 text-foreground',
                )}
                style={msg.role === 'assistant' ? assistantBgStyle : undefined}
              >
                <p className="leading-relaxed">
                  {msg.isRevealing ? msg.revealedText || '…' : msg.text}
                </p>
                <span className="text-[10px] opacity-40 mt-0.5 block">
                  {formatRelative(msg.ts)}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
        {showJumpButton && (
          <button
            onClick={jumpToLatest}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-muted/80 backdrop-blur-sm px-3 py-1 text-[10px] font-medium text-foreground shadow-md hover:bg-muted transition-colors z-20"
          >
            <ArrowDown size={10} />
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
}
