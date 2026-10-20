import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const anim = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' } as const,
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
};

export function DemoCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-5 sm:px-8">
      <motion.div {...anim} className="max-w-6xl mx-auto rounded-[28px] border border-border/60 bg-card p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center gap-8 lg:justify-between">
        <div className="flex flex-col gap-4 max-w-xl">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">NO SETUP NEEDED</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.05]">Try demo mode in ten seconds.</h2>
          <p className="text-muted-foreground leading-relaxed">
            Launch the app, turn on demo mode from the control bar, and watch Ping react to
            scripted events. Type{' '}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">/demo help</code>{' '}
            to see every command.
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/app')} className="gap-2 self-start lg:self-center">
          Launch Ping <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </section>
  );
}

export function FinalCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="py-28 px-5 sm:px-8 text-center">
      <motion.div {...anim} className="max-w-2xl mx-auto flex flex-col items-center gap-5">
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">READY WHEN YOU ARE</span>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.04em] leading-[1.02]">
          Give your notifications <span className="text-primary">a face.</span>
        </h2>
        <p className="text-muted-foreground">
          No account, no credit card, no API keys. Open it and point something at it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-3">
          <Button size="lg" onClick={() => navigate('/app')} className="gap-2">
            Launch app <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/docs')} className="gap-2">
            <BookOpen className="h-4 w-4" /> Documentation
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
