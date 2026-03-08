import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  ArrowRight, Eye, Zap, Shield, Plug, Bell, Sparkles,
  CreditCard, Github, MessageSquare, Gamepad2, SquareKanban, Bug, Triangle, Webhook,
  ChevronRight, Terminal, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import pingLogo from '@/assets/ping-logo-white.png';
import FaceCanvas from '@/components/ping/FaceCanvas';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Eye,
    title: 'Always-On Presence',
    desc: 'An expressive animated face that reacts to your AI agent\'s notifications in real time.',
  },
  {
    icon: Zap,
    title: 'Instant Reactions',
    desc: 'See status changes, errors, and messages the moment they happen — no refresh needed.',
  },
  {
    icon: Plug,
    title: 'Connect Anything',
    desc: 'Webhooks, WebSocket bridge, or REST API. Plug in any AI agent or automation tool.',
  },
  {
    icon: Shield,
    title: 'Privacy-First',
    desc: 'Privacy lock, local-only mode, and automatic redaction. Your data stays yours.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Severity-based routing, sound controls, and do-not-disturb — all configurable.',
  },
  {
    icon: Sparkles,
    title: 'Demo Mode',
    desc: 'No setup required. Launch and explore with scripted demos, effects, and spectacles.',
  },
];

const integrations = [
  { icon: Webhook, name: 'Generic Webhook', desc: 'Any HTTP service, Zapier, Make, n8n, or curl' },
  { icon: CreditCard, name: 'Stripe', desc: 'Payments, subscriptions & revenue events' },
  { icon: Github, name: 'GitHub', desc: 'Pushes, deployments, issues & PRs' },
  { icon: MessageSquare, name: 'Slack', desc: 'Messages, mentions & channel alerts' },
  { icon: Gamepad2, name: 'Discord', desc: 'Server events, messages & bot alerts' },
  { icon: SquareKanban, name: 'Linear', desc: 'Issues, project updates & workflow' },
  { icon: Bug, name: 'Sentry', desc: 'Errors, crashes & production incidents' },
  { icon: Triangle, name: 'Vercel', desc: 'Deploys, build failures & CI/CD' },
];

const howItWorks = [
  { step: '1', title: 'Launch Ping', desc: 'Open the app — no account needed. Start with Demo Mode to explore.' },
  { step: '2', title: 'Connect a Source', desc: 'Point any webhook, bot, or agent at Ping\'s ingest endpoint with a simple POST.' },
  { step: '3', title: 'Watch It React', desc: 'Ping reads your events and responds with expressions, sounds, and spectacles in real time.' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const navigate = useNavigate();
  useAnalytics();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <img src={pingLogo} alt="Ping" className="h-7 opacity-90" />
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/docs')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              Docs
            </button>
            <button
              onClick={() => navigate('/connectors')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              Connectors
            </button>
            <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5">
              Launch App <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 sm:pb-28 px-6 flex flex-col items-center text-center">
        {/* Glow */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--glow-primary)), transparent 70%)' }}
        />

        <Badge variant="outline" className="relative mb-6 text-xs border-primary/30 text-muted-foreground">
          Open-source notification visualizer
        </Badge>

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl">
          Give your{' '}
          <span className="text-primary">AI agents</span>{' '}
          a face
        </h1>

        <p className="relative mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
          Ping is a friendly, eyes-only presence UI. Connect it to any AI agent,
          webhook, or automation — and watch it react to status, messages, and
          alerts in real time.
        </p>

        <div className="relative mt-10 flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={() => navigate('/app')} className="gap-2 text-base px-8">
            Launch App <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/docs')} className="text-base px-8">
            Read the Docs
          </Button>
        </div>

        {/* Animated eyes preview */}
        <div className="relative mt-16 w-full max-w-lg aspect-video rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden shadow-[0_0_80px_-20px_hsl(var(--glow-primary)/0.15)]">
          <FaceCanvas />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
            <Badge variant="secondary" className="text-[10px] bg-muted/60 backdrop-blur-sm">
              Live preview — this is what Ping looks like
            </Badge>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Three steps to a reactive presence
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-md mx-auto">
            No accounts, no API keys to manage. Just launch and connect.
          </p>

          <div className="grid gap-8 sm:grid-cols-3">
            {howItWorks.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Everything your agent needs to be seen
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            A single dashboard that turns invisible background processes into an
            expressive, glanceable presence.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/30 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Connects to the tools you already use
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            8 pre-built connectors with setup guides, cURL builders, and test
            events — or use the generic webhook for anything else.
          </p>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            {integrations.map((i) => (
              <button
                key={i.name}
                onClick={() => navigate(`/docs#${i.name.toLowerCase().replace(/\s/g, '')}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-card/30 p-5 hover:border-primary/30 hover:bg-card/60 transition-colors text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <i.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{i.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <Button variant="outline" onClick={() => navigate('/connectors')} className="gap-2">
              <Plug className="h-4 w-4" /> Browse Connectors
            </Button>
            <Button variant="outline" onClick={() => navigate('/docs')} className="gap-2">
              <BookOpen className="h-4 w-4" /> Integration Docs
            </Button>
          </div>
        </div>
      </section>

      {/* ── Schema peek ── */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Dead-simple event schema
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-md mx-auto">
            Just POST JSON with a source, type, and title. That's it.
          </p>

          <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-muted/20">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">POST /ingest</span>
            </div>
            <pre className="px-5 py-4 text-sm font-mono text-foreground/85 overflow-x-auto leading-relaxed">
{`{
  "source": "my-agent",
  "eventType": "success",
  "title": "Task completed",
  "body": "Processed 142 records in 3.2s",
  "severity": 2,
  "tags": ["pipeline", "data"]
}`}
            </pre>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['success', 'error', 'message', 'warning', 'deploy', 'incident'].map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[11px]">{t}</Badge>
            ))}
          </div>

          <p className="text-center mt-4">
            <button
              onClick={() => navigate('/docs#schema')}
              className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              Full schema reference <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </p>
        </div>
      </section>

      {/* ── Demo mode CTA ── */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">No setup needed</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Try Demo Mode in 10 seconds
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Launch the app, flip on Demo Mode from the control bar, and watch
            Ping react to scripted events. Type{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary/80">/demo help</code>{' '}
            to explore all commands.
          </p>
          <Button size="lg" onClick={() => navigate('/app')} className="gap-2 text-base px-8">
            Launch Ping <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center border-t border-border/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to give your agent a face?
          </h2>
          <p className="text-muted-foreground mb-8">
            No accounts, no credit card, no API keys. Just launch and connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/app')} className="gap-2 text-base px-8">
              Launch App <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/docs')} className="gap-2 text-base px-8">
              <BookOpen className="h-4 w-4" /> Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={pingLogo} alt="Ping" className="h-5 opacity-60" />
            <span>&copy; {new Date().getFullYear()} Ping</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => navigate('/app')} className="hover:text-foreground transition-colors">
              App
            </button>
            <button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">
              Docs
            </button>
            <button onClick={() => navigate('/connectors')} className="hover:text-foreground transition-colors">
              Connectors
            </button>
            <button onClick={() => navigate('/docs#troubleshooting')} className="hover:text-foreground transition-colors">
              Troubleshooting
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

