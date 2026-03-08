import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { handleDemoInput } from '@/lib/demoScriptEngine';
import { sendMessage as bridgeSendMessage } from '@/lib/bridge';
import { playSend } from '@/lib/audio';
import { AttachmentChips } from './AttachmentChips';
import { ATTACHMENT_DEFAULTS } from '@/lib/types';
import type { Attachment } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const att: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataBase64: base64,
      };
      if (file.type.startsWith('image/')) {
        att.blobUrl = URL.createObjectURL(file);
      }
      resolve(att);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Composer() {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocked = useSettingsStore((s) => s.isLocked);
  const addMessage = usePingStore((s) => s.addMessage);
  const setPersistentState = usePingStore((s) => s.setPersistentState);
  const setIsComposerFocused = usePingStore((s) => s.setIsComposerFocused);
  const connectionMode = useSettingsStore((s) => s.connectionMode);
  const bridgeStatus = usePingStore((s) => s.bridgeStatus);

  const caps = bridgeStatus.capabilities ?? ATTACHMENT_DEFAULTS;
  const bridgeConnected = bridgeStatus.connected && connectionMode === 'bridge';
  const canAttach = bridgeConnected && caps.attachments;

  const validateAndAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const remaining = caps.maxAttachmentsPerMessage - attachments.length;

    if (fileArr.length > remaining) {
      toast.error(`Max ${caps.maxAttachmentsPerMessage} attachments per message`);
      return;
    }

    for (const file of fileArr) {
      if (file.size > caps.maxAttachmentBytes) {
        toast.error(`${file.name} exceeds ${Math.round(caps.maxAttachmentBytes / 1024 / 1024)}MB limit`);
        return;
      }
      if (!caps.supportedMimes.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type (${file.type || 'unknown'})`);
        return;
      }
    }

    const newAtts = await Promise.all(fileArr.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...newAtts]);
  }, [attachments.length, caps]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.blobUrl) URL.revokeObjectURL(att.blobUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      revealedText: trimmed,
      isRevealing: false,
      ts: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setPersistentState('thinking');
    setText('');
    setAttachments([]);

    const settings = useSettingsStore.getState();
    playSend(settings.volume, settings.muted, settings.dnd);

    if (connectionMode === 'demo') {
      handleDemoInput(trimmed);
    } else {
      bridgeSendMessage(trimmed, attachments.length > 0 ? attachments : undefined);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canAttach) return;
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [canAttach, validateAndAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (canAttach) setIsDragOver(true);
  }, [canAttach]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  if (isLocked) return null;

  return (
    <div
      className="p-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm border-2 border-dashed border-primary/40 rounded-xl pointer-events-none">
          <p className="text-sm text-primary font-medium">Drop files here</p>
        </div>
      )}

      <AttachmentChips attachments={attachments} onRemove={removeAttachment} />

      <div className="flex gap-2 max-w-xl mx-auto">
        {/* Attach button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => canAttach && fileInputRef.current?.click()}
              size="icon"
              variant="ghost"
              className={`shrink-0 transition-colors ${
                canAttach
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-muted-foreground/30 cursor-not-allowed'
              }`}
              disabled={!canAttach}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[220px]">
            {canAttach
              ? 'Attach files (images, PDFs, text)'
              : 'Attachments require a connected local bridge'}
          </TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={caps.supportedMimes.join(',')}
          onChange={(e) => {
            if (e.target.files) validateAndAddFiles(e.target.files);
            e.target.value = '';
          }}
        />

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
          data-composer-input
          className="bg-muted/30 border-border/40 text-foreground placeholder:text-muted-foreground/40 backdrop-blur-sm"
        />
        <Button
          onClick={handleSend}
          size="icon"
          variant="ghost"
          className="text-primary hover:text-primary/80 shrink-0"
          disabled={!text.trim() && attachments.length === 0}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Privacy note */}
      {attachments.length > 0 && (
        <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
          Attachments are processed locally via your bridge — not stored on Ping servers.
        </p>
      )}
    </div>
  );
}
