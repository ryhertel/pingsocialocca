import { connectorTemplates } from '@/lib/connectors/connectorTemplates';

export type TickerMood = 'proud' | 'oops' | 'surprise' | 'curious';

/** What Ping does when this service fires. Keyed by connector id. */
const TEASERS: Record<string, { line: string; mood: TickerMood }> = {
  github: { line: 'push to main → fireworks', mood: 'proud' },
  stripe: { line: 'a sale lands → Ping beams', mood: 'proud' },
  vercel: { line: 'deploy ships → victory lap', mood: 'proud' },
  watchrr: { line: 'a service goes down → Ping winces', mood: 'oops' },
  sentry: { line: 'new error → a polite uh-oh', mood: 'oops' },
  linear: { line: 'issue moves → Ping perks up', mood: 'surprise' },
  slack: { line: 'new message → Ping looks up', mood: 'surprise' },
  discord: { line: 'server pings → Ping notices', mood: 'surprise' },
  generic: { line: 'one curl → any reaction', mood: 'curious' },
  openclaw: { line: 'your local agent → gets a face', mood: 'curious' },
};

export const TICKER_ITEMS = [
  ...connectorTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    // A connector added later without a teaser still gets a sensible line.
    line: TEASERS[t.id]?.line ?? t.description,
    mood: TEASERS[t.id]?.mood ?? ('curious' as TickerMood),
  })),
  // Not a connector template, but built in and with its own section in the docs.
  { id: 'email', name: 'Email', line: 'anything you forward → a reaction', mood: 'surprise' as TickerMood },
];
