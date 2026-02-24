import { X, FileText, Image, File } from 'lucide-react';
import type { Attachment } from '@/lib/types';

interface AttachmentChipsProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getIcon(mime: string) {
  if (mime.startsWith('image/')) return Image;
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText;
  return File;
}

export function AttachmentChips({ attachments, onRemove }: AttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-1">
      {attachments.map((att) => {
        const Icon = getIcon(att.mime);
        return (
          <div
            key={att.id}
            className="flex items-center gap-1.5 rounded-lg bg-muted/40 backdrop-blur-sm border border-border/30 px-2.5 py-1 text-xs text-foreground max-w-[200px] group"
          >
            {att.blobUrl ? (
              <img
                src={att.blobUrl}
                alt={att.name}
                className="h-5 w-5 rounded object-cover shrink-0"
              />
            ) : (
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">{att.name}</span>
            <span className="text-muted-foreground/60 shrink-0">{formatSize(att.size)}</span>
            <button
              onClick={() => onRemove(att.id)}
              className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 transition-colors shrink-0 opacity-60 group-hover:opacity-100"
              aria-label={`Remove ${att.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
