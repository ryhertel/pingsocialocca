import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ChevronDown, ChevronRight, Shield, Terminal, Zap, BookOpen } from 'lucide-react';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import type { ConnectorTemplate } from '@/lib/connectors/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import pingLogo from '@/assets/ping-logo-white.png';

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

  return `curl -X POST "https://YOUR_INGEST_URL/ingest?key=YOUR_CHANNEL_KEY" \\
  -H "Content-Type: application/json" \\
  -H "x-ping-secret: YOUR_INGEST_SECRET" \\
  -d '${payload}'`;
}

/* ------------------------------------------------------------------ */
/*  JSON schema reference                                              */
/* ------------------------------------------------------------------ */
const SCHEMA_EXAMPLE = `{
  "source": "my-app",
  "eventType": "success | error | message | warning | deploy | incident",
  "title": "Short headline (required)",
  "body": "Optional details",
  "severity": 3,
  "tags": ["optional", "tags"],
  "timestamp": 1700000000000
}`;

/* ------------------------------------------------------------------ */
/*  Connector doc card                                                 */
/* ------------------------------------------------------------------ */
function ConnectorDoc({ template }: { template: ConnectorTemplate }) {
  return (
    <section id={template.id} className="scroll-mt-20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">{template.name}</h2>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-muted-foreground">
            Connector
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>

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
            Replace <code className="text-primary/80 bg-muted px-1 rounded">YOUR_INGEST_URL</code>,{' '}
            <code className="text-primary/80 bg-muted px-1 rounded">YOUR_CHANNEL_KEY</code>, and{' '}
            <code className="text-primary/80 bg-muted px-1 rounded">YOUR_INGEST_SECRET</code> with your actual values from the Connect panel.
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
/*  Troubleshooting                                                    */
/* ------------------------------------------------------------------ */
function Troubleshooting() {
  const items = [
    {
      q: 'Events not showing up?',
      a: 'Check that your channel key and ingest secret match the values in the Connect panel. Verify the Ingest URL is correct and the POST body is valid JSON.',
    },
    {
      q: 'Getting 401 / 403 errors?',
      a: 'Your x-ping-secret header is missing or wrong. Copy it again from the Connect panel. Secrets are case-sensitive.',
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
    <section id="troubleshooting" className="scroll-mt-20 space-y-4">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={pingLogo} alt="Ping" className="h-6 opacity-80" />
          <span className="text-sm font-medium text-foreground/70">Docs</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* Intro */}
        <section className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Ping Integration Guide</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Send events to Ping via HTTP webhooks and watch it react in real time.
            This guide covers the JSON schema, setup for each connector, cURL examples, and troubleshooting.
          </p>
        </section>

        {/* Quick nav */}
        <nav className="flex flex-wrap gap-2">
          {connectorTemplates.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {t.name}
            </a>
          ))}
          <a
            href="#schema"
            className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Schema
          </a>
          <a
            href="#troubleshooting"
            className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Troubleshooting
          </a>
        </nav>

        {/* JSON Schema */}
        <section id="schema" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Event Schema</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every event POSTed to the ingest endpoint must follow this JSON shape.
            Only <code className="text-primary/80 bg-muted px-1 rounded">source</code>,{' '}
            <code className="text-primary/80 bg-muted px-1 rounded">eventType</code>, and{' '}
            <code className="text-primary/80 bg-muted px-1 rounded">title</code> are required.
          </p>
          <CodeBlock code={SCHEMA_EXAMPLE} lang="json" />
        </section>

        {/* Connector docs — generated from templates */}
        {connectorTemplates.map((t) => (
          <ConnectorDoc key={t.id} template={t} />
        ))}

        {/* Troubleshooting */}
        <Troubleshooting />
      </main>
    </div>
  );
}
