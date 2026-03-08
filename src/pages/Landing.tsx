import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Zap, Shield, Plug, Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pingLogo from '@/assets/ping-logo-white.png';

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
    desc: 'Privacy lock, local-only mode, and redaction built in. Your data stays yours.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Severity-based routing, sound controls, and do-not-disturb — all configurable.',
  },
  {
    icon: Sparkles,
    title: 'Try Demo Mode',
    desc: 'No setup required. Launch the app and see Ping come alive with scripted demos.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <img src={pingLogo} alt="Ping" className="h-7 opacity-90" />
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/docs')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </button>
            <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5">
              Launch App <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center">
        {/* Glow backdrop */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--glow-primary)), transparent 70%)' }}
        />

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl">
          The notification visualizer for your{' '}
          <span className="text-primary">AI agents</span>
        </h1>

        <p className="relative mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
          Ping is a friendly, eyes-only presence UI. Connect it to any AI agent
          and watch it react to status, messages, and alerts in real time.
        </p>

        <div className="relative mt-10 flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={() => navigate('/app')} className="gap-2 text-base px-8">
            Launch App <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/docs')}
            className="text-base px-8"
          >
            Read the Docs
          </Button>
        </div>

        {/* Animated eyes preview */}
        <div className="relative mt-16 w-full max-w-md aspect-video rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden flex items-center justify-center">
          <EyesPreview />
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Everything your agent needs to be seen
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
            A single dashboard that turns invisible background processes into an expressive, glanceable presence.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to give your agent a face?</h2>
          <p className="text-muted-foreground mb-8">
            No account needed. Launch the app, flip on Demo Mode, and see Ping in action.
          </p>
          <Button size="lg" onClick={() => navigate('/app')} className="gap-2 text-base px-8">
            Launch Ping <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={pingLogo} alt="Ping" className="h-5 opacity-60" />
            <span>© {new Date().getFullYear()} Ping</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">
              Docs
            </button>
            <button onClick={() => navigate('/connectors')} className="hover:text-foreground transition-colors">
              Connectors
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Mini animated eyes for the hero card */
function EyesPreview() {
  return (
    <svg viewBox="0 0 200 80" className="w-48 opacity-80">
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--glow-primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Left eye */}
      <ellipse cx="65" cy="40" rx="22" ry="22" fill="none" stroke="hsl(var(--glow-primary))" strokeWidth="2" opacity="0.7">
        <animate attributeName="ry" values="22;2;22" dur="4s" repeatCount="indefinite" begin="0s" keyTimes="0;0.05;0.1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
      </ellipse>
      <circle cx="65" cy="40" r="8" fill="hsl(var(--glow-primary))">
        <animate attributeName="cx" values="65;68;62;65" dur="6s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="65" cy="40" rx="30" ry="30" fill="url(#eyeGlow)" opacity="0.3" />

      {/* Right eye */}
      <ellipse cx="135" cy="40" rx="22" ry="22" fill="none" stroke="hsl(var(--glow-primary))" strokeWidth="2" opacity="0.7">
        <animate attributeName="ry" values="22;2;22" dur="4s" repeatCount="indefinite" begin="0s" keyTimes="0;0.05;0.1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
      </ellipse>
      <circle cx="135" cy="40" r="8" fill="hsl(var(--glow-primary))">
        <animate attributeName="cx" values="135;138;132;135" dur="6s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="135" cy="40" rx="30" ry="30" fill="url(#eyeGlow)" opacity="0.3" />
    </svg>
  );
}
