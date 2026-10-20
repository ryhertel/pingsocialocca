import type { ReactNode } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

/**
 * Ping as a small physical object: a ceramic body with a dark glass screen, a
 * speaker grille and two real buttons. The face inside stays soft and alive;
 * everything around it is exact. That contrast is the whole design.
 *
 * MUTE and DND are wired to the same settings the app uses, so they do what they
 * say rather than decorating.
 */

const GRILLE_DOTS = 16;

interface DeviceShellProps {
  /** The screen's contents — normally the live FaceCanvas. */
  children: ReactNode;
  /** Small readout pinned to the bottom-left of the screen. */
  caption?: ReactNode;
  /** Right-hand label on the device body, beside the status light. */
  status?: string;
  className?: string;
}

export function DeviceShell({ children, caption, status = 'READY', className }: DeviceShellProps) {
  const muted = useSettingsStore((s) => s.muted);
  const dnd = useSettingsStore((s) => s.dnd);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const setDnd = useSettingsStore((s) => s.setDnd);
  const { vibrate } = useHaptics();

  return (
    <div className={cn('device-shell rounded-[44px] sm:rounded-[56px] p-4 sm:p-[22px] flex flex-col gap-3 sm:gap-[18px]', className)}>
      <div className="flex items-center justify-between px-3 sm:px-[18px] pt-1 font-mono text-[10px] sm:text-[11px] tracking-[0.14em] text-[hsl(var(--device-label))]">
        <span>PING · P-01</span>
        <span className="flex items-center gap-[7px]">
          <span
            className={cn(
              'h-[7px] w-[7px] rounded-full transition-colors',
              dnd ? 'bg-[hsl(var(--ping-warning))]' : 'bg-primary shadow-[0_0_10px_hsl(var(--primary))]',
            )}
            aria-hidden="true"
          />
          {dnd ? 'DND' : status}
        </span>
      </div>

      <div className="device-screen relative aspect-[16/10] rounded-[26px] sm:rounded-[34px] overflow-hidden">
        {children}
        {caption && (
          <div className="pointer-events-none absolute left-4 sm:left-[22px] bottom-3 sm:bottom-4 font-mono text-[10px] sm:text-[11px] tracking-[0.06em] text-primary/70">
            {caption}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 sm:px-[14px]">
        <div className="grid grid-cols-8 gap-[6px] sm:gap-[7px]" aria-hidden="true">
          {Array.from({ length: GRILLE_DOTS }, (_, i) => (
            <span key={i} className="h-[5px] w-[5px] sm:h-1.5 sm:w-1.5 rounded-full bg-[hsl(var(--device-edge))]" />
          ))}
        </div>
        <div className="flex gap-3 sm:gap-[14px]">
          <button
            type="button"
            onClick={() => { vibrate('tap'); setMuted(!muted); }}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            className={cn('device-key', muted && 'device-key-on')}
          >
            MUTE
          </button>
          <button
            type="button"
            onClick={() => { vibrate('tap'); setDnd(!dnd); }}
            aria-pressed={dnd}
            aria-label={dnd ? 'Turn off do not disturb' : 'Turn on do not disturb'}
            className={cn('device-key', dnd && 'device-key-on')}
          >
            DND
          </button>
        </div>
      </div>
    </div>
  );
}
