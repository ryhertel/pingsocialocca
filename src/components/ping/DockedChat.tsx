import { useRef, useEffect, useState, useCallback } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Lock, ArrowDown, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleDemoButtonClick } from '@/lib/demoScriptEngine';
import { playSend } from '@/lib/audio';
import type { Attachment, AttachmentSummary } from '@/lib/types';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}

function AttachmentPreviews({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-1 rounded-md bg-background/30 px-2 py-1 text-[10px]">
          {att.blobUrl ? (
            <img src={att.blobUrl} alt={att.name} className="h-8 w-8 rounded object-cover" />
          ) : att.mime.startsWith('image/') ? (
            <Image className="h-3 w-3 text-muted-foreground" />
          ) : att.mime === 'application/pdf' || att.mime.startsWith('text/') ? (
            <FileText className="h-3 w-3 text-muted-foreground" />
          ) : (
            <File className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="truncate max-w-[100px]">{att.name}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryNotes({ summaries }: { summaries?: AttachmentSummary[] }) {
  if (!summaries || summaries.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {summaries.map((s) => (
        <div key={s.id} className="text-[10px] text-muted-foreground/70 italic bg-background/20 rounded px-2 py-1">
          📎 {s.name}: {s.notes || s.kind}
        </div>
      ))}
    </div>
  );
}

const NEAR_BOTTOM_THRESHOLD = 120;

interface DockedChatProps {
  className?: string;
}

export function DockedChat({ className }: DockedChatProps) {
  const messages = usePingStore((s) => s.messages);
  const addMessage = usePingStore((s) => s.addMessage);
  const setPersistentState = usePingStore((s) => s.setPersistentState);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const unlock = useSettingsStore((s) => s.unlock);
  const theme = useSettingsStore((s) => s.theme);
  const connectionMode = useSettingsStore((s) => s.connectionMode);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const prevLengthRef = useRef(messages.length);
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
    setShowJumpButton(!nearBottom && messages.length > 0);
  }, [messages.length]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const jumpToLatest = useCallback(() => {
    scrollToBottom('smooth');
    setShowJumpButton(false);
  }, [scrollToBottom]);

  useEffect(() => {
    if (!isNearBottom.current) return;
    const isNewMessage = messages.length !== prevLengthRef.current;
    prevLengthRef.current = messages.length;
    scrollToBottom(isNewMessage ? 'smooth' : 'auto');
  }, [messages.length, messages[messages.length - 1]?.revealedText, scrollToBottom]);

  const handleButtonClick = (label: string, action: string) => {
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      text: label,
      revealedText: label,
      isRevealing: false,
      ts: Date.now(),
    });
    const settings = useSettingsStore.getState();
    playSend(settings.volume, settings.muted, settings.dnd);
    setPersistentState('thinking');
    handleDemoButtonClick(action);
  };

  const lastAssistantIndex = messages.reduce(
    (acc, msg, i) => (msg.role === 'assistant' ? i : acc),
    -1,
  );

  if (isLocked) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-3', className)}>
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">Session Locked</p>
        <Button size="sm" variant="outline" onClick={unlock} className="text-xs">
          Unlock
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      <div className="px-3 py-2 border-b border-border/30 shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Chat Log</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="space-y-2 p-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground/40 text-center py-8">No messages yet</p>
          )}
          {messages.map((msg, idx) => (
            <div key={msg.id}>
              <div
                className={cn(
                  'text-xs rounded-lg px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-muted/50 ml-6 text-foreground'
                    : 'mr-4 text-foreground',
                )}
                style={msg.role === 'assistant' ? assistantBgStyle : undefined}
              >
                <p className="leading-relaxed chat-selectable cursor-text">
                  {msg.isRevealing ? msg.revealedText || '…' : msg.text}
                </p>
                <AttachmentPreviews attachments={msg.attachments} />
                <SummaryNotes summaries={msg.attachmentSummaries} />
                <span className="text-[10px] opacity-40 mt-0.5 block">
                  {formatRelative(msg.ts)}
                </span>
              </div>
              {connectionMode === 'demo' &&
                msg.role === 'assistant' &&
                idx === lastAssistantIndex &&
                !msg.isRevealing &&
                msg.buttons &&
                msg.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 mr-4">
                    {msg.buttons.map((btn) => (
                      <button
                        key={btn.action}
                        onClick={() => handleButtonClick(btn.label, btn.action)}
                        className="rounded-full px-3 py-1 text-[10px] border border-primary/30 bg-primary/5 hover:bg-primary/15 text-foreground transition-colors backdrop-blur-sm"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
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
  );
}
