import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { triggerDemoResponse } from '@/lib/demoEngine';
import { sendMessage as bridgeSendMessage } from '@/lib/bridge';
import { playSend } from '@/lib/audio';

export function Composer() {
  const [text, setText] = useState('');
  const isLocked = useSettingsStore((s) => s.isLocked);
  const addMessage = usePingStore((s) => s.addMessage);
  const setPersistentState = usePingStore((s) => s.setPersistentState);
  const setIsComposerFocused = usePingStore((s) => s.setIsComposerFocused);
  const connectionMode = useSettingsStore((s) => s.connectionMode);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      revealedText: trimmed,
      isRevealing: false,
      ts: Date.now(),
    });

    setPersistentState('thinking');
    setText('');

    const settings = useSettingsStore.getState();
    playSend(settings.volume, settings.muted, settings.dnd);

    if (connectionMode === 'demo') {
      triggerDemoResponse();
    } else {
      bridgeSendMessage(trimmed);
    }
  };

  if (isLocked) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
      <div className="flex gap-2 max-w-xl mx-auto">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsComposerFocused(true)}
          onBlur={() => setIsComposerFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          className="bg-muted/30 border-border/40 text-foreground placeholder:text-muted-foreground/40 backdrop-blur-sm"
        />
        <Button
          onClick={handleSend}
          size="icon"
          variant="ghost"
          className="text-primary hover:text-primary/80 shrink-0"
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
