import { Eye, Zap, Plug, Shield, Bell, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

const features = [
  { icon: Eye, title: 'Always-on presence', desc: 'A face for a spare screen that reacts the moment something happens, so you notice without checking.' },
  { icon: Zap, title: 'Instant reactions', desc: 'Events stream in live. No refresh, no inbox to open, nothing to poll.' },
  { icon: Plug, title: 'Connect anything', desc: 'Webhooks, email-in, a WebSocket bridge or plain curl. GitHub, Stripe and Vercel work as they come.' },
  { icon: Shield, title: 'Privacy-first', desc: 'Titles are redacted server-side, tokens are stored only as hashes, and a privacy lock hides everything on screen.' },
  { icon: Bell, title: 'Loud only when it matters', desc: 'Severity decides how big a reaction is. Sound, mute and do-not-disturb are one press away.' },
  { icon: Sparkles, title: 'Demo mode', desc: 'No setup needed to see it. Launch the app and watch it react to scripted events.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-5 sm:px-8 scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader label="WHAT IT DOES" title="Notifications you see, not ones you check.">
          Ping turns the things happening in your tools into a presence you can read at a glance.
        </SectionHeader>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-card p-6"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-lg tracking-[-0.01em]">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
