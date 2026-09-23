import { motion } from 'framer-motion';

const howItWorks = [
  { step: '1', title: 'Open Ping', desc: 'It starts reacting immediately — no account, nothing to install.' },
  { step: '2', title: 'Claim your URL', desc: 'One click gives you a webhook URL. Paste it into GitHub, Stripe, Vercel or a script.' },
  { step: '3', title: 'Watch it react', desc: 'Ping reads each event and answers with an expression, a sound and a spectacle.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-6 border-t border-border/20 scroll-mt-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Three steps to a reactive presence
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-md mx-auto">
          No account, no install, no middleware. Open it and paste one URL.
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          {howItWorks.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {s.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
