import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'M', desc: 'Toggle mute' },
  { key: 'D', desc: 'Toggle Do Not Disturb' },
  { key: 'S', desc: 'Open settings' },
  { key: '/', desc: 'Focus composer' },
  { key: '?', desc: 'Show this help' },
  { key: 'Esc', desc: 'Close dialogs' },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Available when no input is focused.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-mono border border-border/50">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
