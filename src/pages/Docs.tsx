import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ChevronDown, ChevronRight, Shield, Terminal, Zap, BookOpen, Search, X } from 'lucide-react';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import type { ConnectorTemplate } from '@/lib/connectors/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getEmailDomain } from '@/lib/ingest/privateReadClient';
import { PingWordmark } from '@/components/landing/PingWordmark';

/* ------------------------------------------------------------------ */
/*  Clipboard helper                                                   */
/* ------------------------------------------------------------------ */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Code block                                                         */
/* ------------------------------------------------------------------ */
function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-card border border-border/40 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-foreground/90">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */
function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Curl example builder                                               */
/* ------------------------------------------------------------------ */
function buildCurl(t: ConnectorTemplate): string {
  const te = t.testEvent;
  const payload = JSON.stringify({
    source: te.source,
    eventType: te.eventType,
    title: te.title,
    ...(te.body ? { body: te.body } : {}),
    timestamp: Date.now(),
  }, null, 2);

  return `curl -X POST "https://YOUR_WEBHOOK_URL" \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;
}

/* ------------------------------------------------------------------ */
/*  JSON schema reference                                              */
/* ------------------------------------------------------------------ */
const SCHEMA_EXAMPLE = `{
  "title": "Short headline (required, max 120)",
  "source": "my-app",
  "eventType": "success | error | message | thinking | warning | incident | deploy",
  "body": "Optional details (max 500)",
  "severity": 2,
  "tags": ["optional", "tags"],
  "timestamp": 1700000000000
}`;

/**
 * Only `title` is genuinely required for a loose payload — everything else has a
 * sensible default, and Ping reads the text for keywords either way.
 */
const SCHEMA_MINIMAL = `{ "title": "Invoice #204 paid" }`;

/* ------------------------------------------------------------------ */
/*  Transport badge                                                    */
/* ------------------------------------------------------------------ */

/**
 * Says up front how much work a connector actually is. The old docs implied
 * every source was equally easy, which sent people to Zapier for ones that now
 * work by pasting a URL — and implied parity for Discord, which cannot.
 */
const TRANSPORT_LABELS: Record<ConnectorTemplate['transport'], { label: string; hint: string; className: string }> = {
  direct: {
    label: 'Paste the URL',
    hint: 'Ping reads this provider\'s payload as it comes. Nothing in between.',
    className: 'border-green-500/40 text-green-400',
  },
  generic: {
    label: 'Send JSON',
    hint: 'Anything that can POST JSON works. A title is the only required field.',
    className: 'border-primary/40 text-primary',
  },
  middleware: {
    label: 'Needs a relay',
    hint: 'This source cannot post to an arbitrary URL on its own — it needs an app, bot or automation step.',
    className: 'border-orange-500/40 text-orange-400',
  },
  bridge: {
    label: 'Local bridge',
    hint: 'A WebSocket on your own machine rather than HTTP. Nothing leaves your computer.',
    className: 'border-blue-500/40 text-blue-400',
  },
};

function TransportBadge({ transport }: { transport: ConnectorTemplate['transport'] }) {
  const meta = TRANSPORT_LABELS[transport];
  return (
    <Badge variant="outline" className={cn('text-[10px]', meta.className)} title={meta.hint}>
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Connector doc card                                                 */
/* ------------------------------------------------------------------ */
function ConnectorDoc({ template }: { template: ConnectorTemplate }) {
  return (
    <section id={template.id} className="scroll-mt-24">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">{template.name}</h2>
          <TransportBadge transport={template.transport} />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
        <p className="text-xs text-muted-foreground/80 leading-relaxed">
          {TRANSPORT_LABELS[template.transport].hint}
        </p>

        {/* Setup steps */}
        <CollapsibleSection title="Setup Steps" icon={<Zap className="h-4 w-4 text-primary" />} defaultOpen>
          <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
            {template.setupSteps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </CollapsibleSection>

        {/* Curl example */}
        <CollapsibleSection title="cURL Example" icon={<Terminal className="h-4 w-4 text-primary" />}>
          <p className="text-xs text-muted-foreground mb-2">
            Replace <code className="text-primary/80 bg-muted px-1 rounded">YOUR_WEBHOOK_URL</code>{' '}
            with the URL from the Webhooks panel — it already contains your channel key and
            write token.
          </p>
          <CodeBlock code={buildCurl(template)} />
        </CollapsibleSection>

        {/* Keywords */}
        <CollapsibleSection title="Supported Keywords" icon={<BookOpen className="h-4 w-4 text-primary" />}>
          <p className="text-xs text-muted-foreground mb-2">
            These keywords in event titles or bodies trigger specific Ping reactions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {template.keywordsSupported.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-[11px] font-mono">
                {kw}
              </Badge>
            ))}
          </div>
          {template.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{template.notes}</p>
          )}
        </CollapsibleSection>

        {/* Security */}
        <CollapsibleSection title="Security" icon={<Shield className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-foreground/80 leading-relaxed">{template.securityCopy}</p>
        </CollapsibleSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Email-in                                                           */
/* ------------------------------------------------------------------ */
const EMAIL_STEPS = [
  { title: 'Get your address', desc: 'Open the app, press “Make it mine”, and your channel comes with its own address. Find it again any time under “My channel”.' },
  { title: 'Forward anything', desc: 'Send or forward any email to that address. Ping reacts within a couple of seconds.' },
  { title: 'Automate it with a filter', desc: 'In Gmail, first add the address under Settings → Forwarding and POP/IMAP → “Add a forwarding address”. Gmail emails a confirmation code to it, which shows up in Ping as “Forwarding confirmation code: …” — type that code into Gmail. Then create a filter that matches the sender or subject and choose “Forward it to” your Ping address. In Outlook, use Rules → “Forward to”.' },
  { title: 'Or give the address to a service', desc: 'Anything with an “email me when…” setting — uptime monitors, store receipts, school or delivery alerts — can notify Ping directly.' },
];

const EMAIL_HANDLING = [
  ['Subject', 'becomes the title. No subject? The first real line of the message is used instead.'],
  ['Body', 'is cut down to the first line or two of actual content. Quoted replies, signatures after “--” and “Sent from my phone” lines are dropped.'],
  ['Sender', 'shows as a tag with their domain, such as socialocca.com, so you can tell sources apart.'],
  ['Duplicates', 'are ignored: a message delivered twice reacts once.'],
  ['Attachments', 'are ignored, and HTML mail is read as plain text.'],
];

function EmailDoc() {
  const domain = getEmailDomain();
  return (
    <section id="email" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Email</h2>
        <Badge variant="outline" className="text-[10px]">Built in</Badge>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Every channel has its own email address{domain ? <>, ending in <code className="text-primary bg-muted px-1 rounded">@{domain}</code></> : null}.
        Webhooks only reach tools that can send them; almost everything can send an email,
        so this is how receipts, alerts and newsletters make Ping react.
      </p>

      <CollapsibleSection title="Set it up" icon={<Zap className="h-4 w-4 text-primary" />} defaultOpen>
        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
          {EMAIL_STEPS.map((step) => (
            <li key={step.title} className="leading-relaxed">
              <span className="font-medium text-foreground">{step.title}.</span> {step.desc}
            </li>
          ))}
        </ol>
      </CollapsibleSection>

      <CollapsibleSection title="What Ping does with a message" icon={<BookOpen className="h-4 w-4 text-primary" />} defaultOpen>
        <dl className="space-y-2 text-sm">
          {EMAIL_HANDLING.map(([term, desc]) => (
            <div key={term} className="leading-relaxed">
              <dt className="inline font-medium text-foreground">{term}</dt>{' '}
              <dd className="inline text-foreground/80">{desc}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleSection>

      <CollapsibleSection title="Keeping it private" icon={<Shield className="h-4 w-4 text-primary" />}>
        <p className="text-sm text-foreground/80 leading-relaxed">
          The address is random and can’t be guessed, but anyone who has it can post to your
          feed. If it leaks or starts getting spam, press the refresh button next to it: you get
          a new address and the old one stops working immediately. Titles are redacted on the
          server like every other event, so links and tokens never get stored.
        </p>
      </CollapsibleSection>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Troubleshooting                                                    */
/* ------------------------------------------------------------------ */
function Troubleshooting() {
  const items = [
    {
      q: 'Events not showing up?',
      a: 'Open “My channel” in the app and copy the webhook URL again, so you know it is current. Check the request is a POST with a JSON body.',
    },
    {
      q: 'Getting 401 / 403 errors?',
      a: 'Your write token is missing or wrong. Copy the webhook URL again from “My channel” — the token is the &t= part. Providers like GitHub and Stripe need the whole URL, token included.',
    },
    {
      q: 'An email never arrived?',
      a: 'Check you sent it to the address under “My channel” exactly. If you pressed refresh on the address, the old one stopped working. A filter-based forward also needs the one-time confirmation from your mail app before it starts.',
    },
    {
      q: 'Ping doesn\'t react to my events?',
      a: 'Make sure the eventType field matches one of the supported types (success, error, message, warning, deploy, incident). Keywords in the title/body also trigger reactions.',
    },
    {
      q: 'Rate limited?',
      a: 'The ingest endpoint rate-limits by IP. Avoid sending more than ~60 events/minute from the same source.',
    },
  ];

  return (
    <section id="troubleshooting" className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Troubleshooting</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-border/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-1">{item.q}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Docs page                                                     */
/* ------------------------------------------------------------------ */
export default function Docs() {
  const navigate = useNavigate();
  const location = useLocation();

  // Scrolling to a /docs#github link is ScrollManager's job. This only marks the
  // section briefly, so it is obvious which guide was opened.
  useEffect(() => {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; } // a malformed hash like #%
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.classList.remove('docs-arrive');
      void el.offsetWidth; // restart the animation if the same section is opened twice
      el.classList.add('docs-arrive');
    });
    const clear = setTimeout(() => el.classList.remove('docs-arrive'), 2000);
    return () => { cancelAnimationFrame(frame); clearTimeout(clear); };
  }, [location.hash, location.key]);

  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back to home" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PingWordmark />
          <span className="text-sm font-medium text-foreground/70">Docs</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* Intro */}
        <section className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Ping Integration Guide</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Point a webhook at Ping and watch it react. GitHub, Stripe and Vercel work as they come — anything else just needs a title.            This guide covers the schema, per-connector setup, cURL examples and troubleshooting.
          </p>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs…"
              className="w-full h-10 pl-9 pr-9 rounded-lg border border-border/40 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {(() => {
          const q = search.toLowerCase().trim();
          const matchConnector = (t: ConnectorTemplate) =>
            !q ||
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.keywordsSupported.some((kw) => kw.toLowerCase().includes(q)) ||
            t.setupSteps.some((s) => s.toLowerCase().includes(q));

          const filteredConnectors = connectorTemplates.filter(matchConnector);
          const showSchema = !q || 'event schema json source eventtype title body severity tags timestamp'.includes(q);
          const showTroubleshooting = !q || 'troubleshooting 401 403 rate limit events not showing email'.includes(q);
          const showEmail = !q || 'email mail inbox forward forwarding gmail outlook address filter receipts'.includes(q);
          const hasResults = filteredConnectors.length > 0 || showSchema || showEmail || showTroubleshooting;

          return (
            <>
              {/* Quick nav */}
              {!q && (
                <nav className="flex flex-wrap gap-2">
                  {connectorTemplates.map((t) => (
                    <Link key={t.id} to={`#${t.id}`} className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                      {t.name}
                    </Link>
                  ))}
                  <Link to="#email" className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">Email</Link>
                  <Link to="#schema" className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">Schema</Link>
                  <Link to="#troubleshooting" className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">Troubleshooting</Link>
                </nav>
              )}

              {/* JSON Schema */}
              {showSchema && (
                <section id="schema" className="scroll-mt-24 space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Event Schema</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The smallest thing Ping accepts is a title. Everything else has a
                    default, and the reaction is chosen by reading the text — so a plain
                    sentence already works.
                  </p>
                  <CodeBlock code={SCHEMA_MINIMAL} lang="json" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The full shape, for when you want to be explicit.{' '}
                    <code className="text-primary/80 bg-muted px-1 rounded">severity</code> runs
                    0–3: <strong>0</strong> is ambient and drops the overlay so a chatty source
                    stays bearable, <strong>3</strong> forces the urgent reaction no matter what
                    the text says.
                  </p>
                  <CodeBlock code={SCHEMA_EXAMPLE} lang="json" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sending a raw payload from GitHub, Stripe or Vercel instead? Don't reshape
                    it — Ping recognises those and maps them itself. Nothing in between required.
                  </p>
                </section>
              )}

              {/* Connector docs */}
              {filteredConnectors.map((t) => (
                <ConnectorDoc key={t.id} template={t} />
              ))}

              {/* Email-in */}
              {showEmail && <EmailDoc />}

              {/* Troubleshooting */}
              {showTroubleshooting && <Troubleshooting />}

              {/* No results */}
              {!hasResults && (
                <p className="text-sm text-muted-foreground text-center py-8">No results for "{search}"</p>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}
