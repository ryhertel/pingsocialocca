import { Eye, Zap, Plug, Shield, Bell, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Eye, title: 'Always-On Presence', desc: 'An expressive animated face that reacts to your AI agent\'s notifications in real time.' },
  { icon: Zap, title: 'Instant Reactions', desc: 'See status changes, errors, and messages the moment they happen. no refresh needed.' },
  { icon: Plug, title: 'Connect Anything', desc: 'Webhooks, WebSocket bridge, or REST API. Plug in any AI agent or automation tool.' },
  { icon: Shield, title: 'Privacy-First', desc: 'Privacy lock, local-only mode, and automatic redaction. Your data stays yours.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Severity-based routing, sound controls, and do-not-disturb, all configurable.' },
  { icon: Sparkles, title: 'Demo Mode', desc: 'No setup required. Launch and explore with scripted demos, effects, and spectacles.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6 border-t border-border/20 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Everything your agent needs to be seen
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
          A single dashboard that turns invisible background processes into an
          expressive, glanceable presence.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
