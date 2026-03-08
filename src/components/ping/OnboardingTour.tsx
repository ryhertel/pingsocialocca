import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const LS_KEY = 'ping:tourSeen';

interface TourStep {
  targetSelector: string | null;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'center';
}

const steps: TourStep[] = [
  {
    targetSelector: '[data-tour="face"]',
    title: "Ping's Face",
    description: 'This is Ping — it reacts to events and messages in real time.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="composer"]',
    title: 'Composer',
    description: 'Type here to chat with Ping or send commands.',
    position: 'top',
  },
  {
    targetSelector: '[data-tour="controls"]',
    title: 'Control Bar',
    description: 'Access settings, connections, webhooks, and more from here.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="status"]',
    title: 'Status',
    description: "This shows Ping's current connection status.",
    position: 'bottom',
  },
  {
    targetSelector: null,
    title: "You're all set!",
    description: 'Press ? anytime for keyboard shortcuts.',
    position: 'center',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = steps[step];

  const measureTarget = useCallback(() => {
    if (!current.targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(current.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [current.targetSelector]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    measureTarget();
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [open, step, measureTarget]);

  const finish = useCallback(() => {
    localStorage.setItem(LS_KEY, 'true');
    setStep(0);
    onComplete();
  }, [onComplete]);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const isCenter = current.position === 'center' || !rect;
  const padding = 8;

  // Spotlight box-shadow overlay
  const spotlightStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
        pointerEvents: 'none',
        clipPath: `polygon(
          0% 0%, 0% 100%, 
          ${rect.left - padding}px 100%, 
          ${rect.left - padding}px ${rect.top - padding}px, 
          ${rect.right + padding}px ${rect.top - padding}px, 
          ${rect.right + padding}px ${rect.bottom + padding}px, 
          ${rect.left - padding}px ${rect.bottom + padding}px, 
          ${rect.left - padding}px 100%, 
          100% 100%, 100% 0%
        )`,
        background: 'rgba(0,0,0,0.75)',
      }
    : {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.75)',
        pointerEvents: 'none' as const,
      };

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (isCenter) {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else if (rect) {
    const centerX = rect.left + rect.width / 2;
    if (current.position === 'bottom') {
      tooltipStyle = {
        position: 'fixed',
        top: rect.bottom + padding + 12,
        left: Math.max(16, Math.min(centerX, window.innerWidth - 16)),
        transform: 'translateX(-50%)',
      };
    } else {
      tooltipStyle = {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + padding + 12,
        left: Math.max(16, Math.min(centerX, window.innerWidth - 16)),
        transform: 'translateX(-50%)',
      };
    }
  }

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div style={spotlightStyle} />

      {/* Click catcher */}
      <div
        className="fixed inset-0 z-[9999]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-72 rounded-xl border border-border bg-card p-4 shadow-2xl"
        style={tooltipStyle}
      >
        {/* Skip button */}
        <button
          onClick={finish}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-sm font-semibold text-foreground mb-1">{current.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{current.description}</p>

        {/* Step indicator */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => (isLast ? finish() : setStep(step + 1))}
            >
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
