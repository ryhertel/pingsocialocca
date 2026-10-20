/**
 * The logo, drawn rather than imported: the only logo file is white, which
 * vanished on the light theme. This one is the device in miniature, so it
 * follows the theme and the LED colour on its own.
 */
export function PingWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex gap-[3px] rounded-[9px] bg-[hsl(var(--device-shell))] px-[7px] py-1.5 shadow-[inset_0_-2px_0_hsl(var(--device-edge))]" aria-hidden="true">
        <span className="h-[9px] w-[9px] rounded-[3px] bg-primary" />
        <span className="h-[9px] w-[9px] rounded-[3px] bg-primary" />
      </span>
      <span className="text-xl font-bold tracking-[-0.02em] text-foreground">Ping</span>
    </span>
  );
}
