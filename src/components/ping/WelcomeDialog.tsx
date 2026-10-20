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
          <img src="/ping-square.png" alt="Ping" className="h-16 w-16 rounded-2xl" />
          <DialogTitle className="text-xl">Meet Ping</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            A face for your notifications. Point a webhook or an email at Ping — a deploy,
            a payment, an alert — and it reacts with an expression, a sound and a burst of
            colour.
          </DialogDescription>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            It is running a short demo now. Press <strong>Make it mine</strong> for your own
            webhook URL and email address. No account needed.
          </p>
        </DialogHeader>
        <Button onClick={dismiss} className="w-full">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
