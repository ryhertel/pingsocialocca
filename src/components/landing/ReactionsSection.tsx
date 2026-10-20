import { useEffect, useRef, useState } from 'react';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import type { NormalizedEvent } from '@/lib/ingest/types';
import type { PersistentState } from '@/lib/types';
import { usePingStore } from '@/stores/usePingStore';
import { DeviceShell } from './DeviceShell';
import { SectionHeader } from './SectionHeader';
import { cn } from '@/lib/utils';

/**
 * The face's vocabulary, playable. Each card sends a real event through the same
 * router and executor the app uses, so what you see here is exactly what a real
 * webhook would do — not an animation made for the page.
 */

/** Long enough to watch the reaction land, short enough not to leave Ping sulking. */
const SETTLE_AFTER_MS = 3500;

type Glyph = 'proud' | 'oops' | 'surprise' | 'concern';

const REACTIONS: { id: string; glyph: Glyph; label: string; effect: string; event: Pick<NormalizedEvent, 'source' | 'eventType' | 'title' | 'severity'> }[] = [
  { id: 'deploy', glyph: 'proud', label: 'deploy', effect: 'proud · fireworks', event: { source: 'github', eventType: 'deploy', title: 'Deployed to production', severity: 1 } },
  { id: 'error', glyph: 'oops', label: 'error', effect: 'a polite uh-oh', event: { source: 'sentry', eventType: 'error', title: 'TypeError in checkout', severity: 2 } },
  { id: 'message', glyph: 'surprise', label: 'message', effect: 'surprise · looks up', event: { source: 'email', eventType: 'message', title: 'Hello Ping', severity: 1 } },
  { id: 'warning', glyph: 'concern', label: 'warning', effect: 'concern', event: { source: 'vercel', eventType: 'warning', title: 'Build slower than usual', severity: 1 } },
];

function Eyes({ glyph }: { glyph: Glyph }) {
  if (glyph === 'proud') {
    return (
      <svg width="112" height="40" viewBox="0 0 120 44" fill="none" stroke="hsl(var(--primary))" strokeWidth="7" strokeLinecap="round" aria-hidden="true">
        <path d="M10 34 Q28 6 46 34" /><path d="M74 34 Q92 6 110 34" />
      </svg>
    );
  }
  if (glyph === 'oops') {
    return (
      <svg width="112" height="44" viewBox="0 0 120 48" fill="none" stroke="hsl(var(--ping-error))" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 8 L44 24 L14 40" /><path d="M106 8 L76 24 L106 40" />
      </svg>
    );
  }
  if (glyph === 'surprise') {
    return (
      <div className="flex gap-7" aria-hidden="true">
        <span className="h-10 w-10 rounded-full border-[7px] border-primary" />
        <span className="h-10 w-10 rounded-full border-[7px] border-primary" />
      </div>
    );
  }
  return (
    <div className="flex gap-7 pt-2.5" aria-hidden="true">
      <span className="h-[30px] w-[46px] rounded-[10px] bg-[hsl(var(--ping-warning))]" />
      <span className="h-[30px] w-[46px] rounded-[10px] bg-[hsl(var(--ping-warning))]" />
    </div>
  );
}

export function ReactionsSection() {
  const [active, setActive] = useState<string | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restingState = useRef<PersistentState | null>(null);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const play = (reaction: (typeof REACTIONS)[number]) => {
    // Remember how the face looked before the first press, so it returns there.
    if (restingState.current === null) restingState.current = usePingStore.getState().persistentState;

    const now = Date.now();
    executeReaction(routeEvent({ id: `try-${reaction.id}-${now}`, timestamp: now, receivedAt: now, ...reaction.event }));
    setActive(reaction.id);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (restingState.current) usePingStore.getState().setPersistentState(restingState.current);
      restingState.current = null;
      setActive(null);
    }, SETTLE_AFTER_MS);
  };

  return (
    <section id="reactions" className="py-24 px-5 sm:px-8 scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader label="EVENT TYPE → EXPRESSION" title="One face, a vocabulary of reactions." align="left">
          Press one. Each sends a real event through the same path a webhook takes.
        </SectionHeader>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => play(r)}
                aria-pressed={active === r.id}
                aria-label={`Play the ${r.label} reaction`}
                className={cn(
                  'group flex flex-col gap-4 rounded-[22px] border bg-card p-4 sm:p-5 text-left transition-[border-color,transform,box-shadow] duration-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active === r.id ? 'border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]' : 'border-border/60 hover:border-primary/30',
                )}
              >
                <div className="flex h-24 sm:h-[120px] items-center justify-center rounded-2xl bg-[#07090b]">
                  <Eyes glyph={r.glyph} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 font-mono text-xs">
                  <span className="text-foreground">{r.label}</span>
                  <span className="text-muted-foreground truncate">{r.effect}</span>
                </div>
              </button>
            ))}
          </div>

          {/* First on a phone, so the face is on screen above the buttons that drive it. */}
          <div className="order-first lg:order-none w-full max-w-[340px] lg:max-w-none mx-auto lg:sticky lg:top-32">
            <DeviceShell status="TRY ME" caption={active ? `event · ${active}` : 'waiting for a press'}>
              <FaceCanvas eyeScale={2} />
            </DeviceShell>
          </div>
        </div>
      </div>
    </section>
  );
}
