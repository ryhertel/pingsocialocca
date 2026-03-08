import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const anim = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' } as const,
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export function DemoCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 border-t border-border/20">
      <motion.div {...anim} className="max-w-3xl mx-auto text-center">
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
      </motion.div>
    </section>
  );
}

export function FinalCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 text-center border-t border-border/20">
      <motion.div {...anim} className="max-w-2xl mx-auto">
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
      </motion.div>
    </section>
  );
}
