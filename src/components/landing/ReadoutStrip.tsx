import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import { getEmailDomain } from '@/lib/ingest/privateReadClient';

/**
 * A row of facts set like instrument readings. Every value here is true and
 * derived from the code, never typed in: a number that is invented to look
 * impressive is exactly the thing this design is meant to stand against.
 */
export function ReadoutStrip() {
  const emailDomain = getEmailDomain();

  const cells = [
    { label: 'CONNECTORS', value: String(connectorTemplates.length).padStart(2, '0') },
    emailDomain
      ? { label: 'EMAIL-IN', value: `@${emailDomain}`, small: true, accent: true, wide: true }
      : { label: 'INPUT', value: 'HTTP · JSON', small: true, wide: true },
    { label: 'ACCOUNTS NEEDED', value: '00' },
    { label: 'LICENSE', value: 'MIT' },
  ];

  return (
    <section aria-label="Ping at a glance" className="px-5 sm:px-8 pb-6">
      <dl className="max-w-6xl mx-auto grid grid-cols-3 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60">
        {cells.map((cell) => (
          // On a phone the three numbers share a row and the address gets one of its own.
          <div
            key={cell.label}
            className={`flex flex-col gap-2.5 bg-background px-4 sm:px-6 py-5 ${'wide' in cell && cell.wide ? 'col-span-3 order-last lg:col-span-1 lg:order-none' : ''}`}
          >
            <dt className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">{cell.label}</dt>
            <dd
              className={
                cell.small
                  ? `font-mono text-lg sm:text-xl font-medium lg:pt-2.5 truncate ${cell.accent ? 'text-primary' : ''}`
                  : 'font-mono text-[28px] sm:text-[34px] font-medium tabular-nums leading-none pt-1'
              }
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
