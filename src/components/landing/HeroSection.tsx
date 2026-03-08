import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import type { ThemePreset } from '@/lib/types';

export function HeroSection() {
  const navigate = useNavigate();
  const { theme, setTheme } = useSettingsStore();

  return (
    <section className="relative pt-32 pb-20 sm:pb-28 px-6 flex flex-col items-center text-center">
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
        webhook, or automation and watch it react to status, messages, and
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

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-16 w-full max-w-lg aspect-video rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden shadow-[0_0_80px_-20px_hsl(var(--glow-primary)/0.15)]"
      >
        <FaceCanvas />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
          <Badge variant="secondary" className="text-[10px] bg-muted/60 backdrop-blur-sm">
            Live preview. This is what Ping looks like
          </Badge>
        </div>
      </motion.div>
    </section>
  );
}
