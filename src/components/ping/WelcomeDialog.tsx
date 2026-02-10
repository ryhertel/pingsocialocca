import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const LS_KEY = 'ping:welcomeSeen';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {
  const dismiss = () => {
    localStorage.setItem(LS_KEY, 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center gap-5">
        <DialogHeader className="items-center gap-3">
          <img src="/ping-icon.png" alt="Ping" className="h-16 w-16 rounded-2xl" />
          <DialogTitle className="text-xl">Meet Ping</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Ping is your always-on presence companion — an expressive face that listens,
            reacts, and keeps you company. Connect it to a local AI agent or try Demo Mode
            to see it come alive.
          </DialogDescription>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            To connect to a local agent bridge, click <strong>Bridge</strong> and
            enter{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
              ws://127.0.0.1:3939/ping
            </code>.
          </p>
        </DialogHeader>
        <Button onClick={dismiss} className="w-full">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
