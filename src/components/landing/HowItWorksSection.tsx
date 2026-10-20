import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';

const howItWorks = [
  { step: '01', title: 'Open Ping', desc: 'It starts reacting immediately — no account, nothing to install.' },
  { step: '02', title: 'Make it yours', desc: 'One click gives you a webhook URL and an email address. Paste the URL into GitHub, Stripe or Vercel, or forward mail to the address.' },
  { step: '03', title: 'Watch it react', desc: 'Ping reads each event and answers with an expression, a sound and a spectacle.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-5 sm:px-8 scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader label="SETUP · ABOUT A MINUTE" title="Three steps to a face that reacts.">
          No account, no install, no middleware. Open it and point one thing at it.
        </SectionHeader>

        <ol className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {howItWorks.map((s, i) => (
            <motion.li
              key={s.step}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-card p-6"
            >
              <span className="font-mono text-sm text-primary tabular-nums">{s.step}</span>
              <h3 className="font-semibold text-lg tracking-[-0.01em]">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
