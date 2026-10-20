import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, X, Zap, ArrowRight } from 'lucide-react';
import { TICKER_ITEMS, type TickerMood } from '@/lib/landing/tickerItems';
import { TRACK_COPIES, advance, repeatsNeeded, wrapPosition } from '@/lib/landing/tickerLoop';

/**
 * A strip above the nav that scrolls through everything Ping connects to. Each
 * item opens that service's setup guide.
 *
 * It scrolls with real scrollLeft rather than a CSS transform. That costs a little
 * code and buys the things that make tickers feel broken when they are missing:
 * swiping and trackpads work, a keyboard user who tabs to an item can actually
 * see it, and a mouse can grab the strip and drag it.
 */

const SPEED_PX_PER_SEC = 36;
/** After someone swipes or drags, wait this long before drifting again. */
const RESUME_AFTER_MS = 1800;
/** A pointer that moves further than this is a drag, and must not also click. */
const DRAG_THRESHOLD_PX = 5;
const DISMISS_KEY = 'ping-connect-ticker-dismissed';

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(REDUCED_MOTION);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** Ping's eyes in miniature: idle and blinking, then reacting on hover or focus. */
function TinyEyes({ mood, blinkDelay }: { mood: TickerMood; blinkDelay: number }) {
  const stroke = mood === 'oops' ? 'hsl(var(--ping-error))' : 'hsl(var(--primary))';
  return (
    <svg viewBox="0 0 20 12" className="h-3 w-5 shrink-0 overflow-visible" aria-hidden="true">
      <g
        className="ticker-eyes-idle transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0"
        style={{ animationDelay: `${blinkDelay}s` }}
        fill="hsl(var(--primary))"
      >
        <circle cx="6" cy="6" r="2" />
        <circle cx="14" cy="6" r="2" />
      </g>
      <g
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {mood === 'proud' && (<><path d="M3.5 7.5 Q6 3.5 8.5 7.5" /><path d="M11.5 7.5 Q14 3.5 16.5 7.5" /></>)}
        {mood === 'oops' && (<><path d="M4 4 L8 6 L4 8" /><path d="M16 4 L12 6 L16 8" /></>)}
        {mood === 'surprise' && (<><circle cx="6" cy="6" r="2.8" /><circle cx="14" cy="6" r="2.8" /></>)}
        {mood === 'curious' && (<><circle cx="7" cy="4.5" r="1.6" fill={stroke} /><circle cx="15" cy="4.5" r="1.6" fill={stroke} /></>)}
      </g>
    </svg>
  );
}

export function ConnectTicker() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const [repeats, setRepeats] = useState(1);

  // Everything the animation loop reads lives in refs, so pausing never restarts it.
  const groupWidth = useRef(0);
  const pos = useRef(0);
  const hovering = useRef(false);
  const focused = useRef(false);
  const interactingUntil = useRef(0);
  const pausedByUser = useRef(false);
  const drag = useRef<{ id: number; startX: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  pausedByUser.current = userPaused || reducedMotion;

  // Measure one copy, and repeat the list until a copy spans the viewport.
  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const group = groupRef.current;
    if (!scroller || !group) return;
    const width = group.getBoundingClientRect().width;
    if (!(width > 0)) return;

    const needed = repeatsNeeded(scroller.clientWidth, width / repeats);
    if (needed !== repeats) {
      setRepeats(needed); // measure runs again once the new copies have laid out
      return;
    }

    const first = groupWidth.current === 0;
    groupWidth.current = width;
    // Every width is a whole number of lists, so wrapping keeps the same pixels on screen.
    pos.current = first ? width : wrapPosition(pos.current, width);
    scroller.scrollLeft = pos.current;
  }, [repeats]);

  useLayoutEffect(() => {
    if (dismissed) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    if (scrollerRef.current) ro.observe(scrollerRef.current);
    if (groupRef.current) ro.observe(groupRef.current);
    return () => ro.disconnect();
  }, [measure, dismissed]);

  useEffect(() => {
    if (dismissed) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const scroller = scrollerRef.current;
      const width = groupWidth.current;
      const elapsed = now - last;
      last = now;

      if (scroller && width > 0) {
        const paused =
          pausedByUser.current || hovering.current || focused.current || drag.current !== null ||
          now < interactingUntil.current;

        // While paused, follow whatever the person is doing rather than fighting it.
        pos.current = paused ? scroller.scrollLeft : advance(pos.current, SPEED_PX_PER_SEC, elapsed);

        // Never wrap under keyboard focus: the focused item would jump off screen
        // and an identical clone, without the focus ring, would sit where it was.
        if (!focused.current) {
          const wrapped = wrapPosition(pos.current, width);
          if (wrapped !== pos.current) {
            if (drag.current) drag.current.startScroll += wrapped - pos.current;
            pos.current = wrapped;
            scroller.scrollLeft = wrapped;
          } else if (!paused) {
            scroller.scrollLeft = wrapped;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dismissed]);

  const noteInteraction = () => {
    interactingUntil.current = performance.now() + RESUME_AFTER_MS;
  };

  // Mouse drag. Touch and pens already scroll natively, so leave them alone.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollerRef.current) return;
    drag.current = { id: e.pointerId, startX: e.clientX, startScroll: scrollerRef.current.scrollLeft, moved: false };
    suppressClick.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const scroller = scrollerRef.current;
    if (!d || d.id !== e.pointerId || !scroller) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      d.moved = true;
      // Capture only once it is really a drag. Capturing on press would retarget
      // the click away from the link the person meant to press.
      scroller.setPointerCapture(e.pointerId);
    }
    if (d.moved) scroller.scrollLeft = d.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      suppressClick.current = true;
      noteInteraction();
    }
    drag.current = null;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
  };

  if (dismissed) return null;

  const paused = userPaused || reducedMotion;

  return (
    <div
      role="region"
      aria-label="Connect Ping to your services"
      className="flex h-9 items-stretch border-b border-border/40 bg-primary/[0.06] text-xs"
    >
      <div className="hidden sm:flex shrink-0 items-center gap-1.5 pl-4 pr-3 font-medium text-foreground/90 border-r border-border/40">
        <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Plug Ping into
      </div>

      <div
        ref={scrollerRef}
        data-testid="ticker-scroller"
        className="ticker-scroller min-w-0 flex-1 overflow-x-auto overscroll-x-contain select-none cursor-grab active:cursor-grabbing"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') hovering.current = true; }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') hovering.current = false; }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onWheel={noteInteraction}
        onTouchStart={noteInteraction}
        onTouchEnd={noteInteraction}
        onFocus={() => { focused.current = true; }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            focused.current = false;
            noteInteraction();
          }
        }}
      >
        <div className="flex h-full w-max">
          {Array.from({ length: TRACK_COPIES }, (_, copy) => {
            // The middle copy is the real one; the outer two exist only so the loop is seamless.
            const isClone = copy !== 1;
            return (
              <ul
                key={copy}
                ref={copy === 0 ? groupRef : undefined}
                aria-hidden={isClone || undefined}
                className="flex h-full shrink-0 items-center"
              >
                {Array.from({ length: repeats }, (_, rep) =>
                  TICKER_ITEMS.map((item, i) => {
                    const isReal = !isClone && rep === 0;
                    return (
                      <li key={`${rep}-${item.id}`} className="shrink-0 px-1" aria-hidden={(!isClone && !isReal) || undefined}>
                        <Link
                          to={`/docs#${item.id}`}
                          tabIndex={isReal ? undefined : -1}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                          className="group flex items-center gap-2 rounded-full px-3 py-1 whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <TinyEyes mood={item.mood} blinkDelay={(i * 0.7) % 5} />
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span>{item.line}</span>
                        </Link>
                      </li>
                    );
                  }),
                )}
              </ul>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/40 px-1.5">
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? 'Resume scrolling' : 'Pause scrolling'}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}
        <Link
          to="/docs"
          className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          All guides <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide this bar"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
