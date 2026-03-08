import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import type { ThemePreset } from '@/lib/types';
import { useState, useCallback } from 'react';
import { playSwatchPop } from '@/lib/audio';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
}

let particleId = 0;

export function HeroSection() {
  const navigate = useNavigate();
  const { theme, setTheme } = useSettingsStore();
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = useCallback((e: React.MouseEvent<HTMLButtonElement>, color: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('[data-swatch-container]')?.getBoundingClientRect();
    if (!container) return;

    const cx = rect.left + rect.width / 2 - container.left;
    const cy = rect.top + rect.height / 2 - container.top;
    const count = 8 + Math.floor(Math.random() * 5);
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 18 + Math.random() * 22;
      newParticles.push({
        id: ++particleId,
        x: cx,
        y: cy,
        color,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
      });
    }

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 600);
  }, []);

  return (
    <section className="relative pt-32 pb-20 sm:pb-28 px-6 flex flex-col items-center text-center">
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none transition-[background] duration-400 ease-in-out"
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
        className="relative mt-16 w-full max-w-lg aspect-video rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden shadow-[0_0_80px_-20px_hsl(var(--glow-primary)/0.15)] transition-[box-shadow,border-color] duration-400 ease-in-out"
      >
        <FaceCanvas />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
          <Badge variant="secondary" className="text-[10px] bg-muted/60 backdrop-blur-sm">
            Live preview. This is what Ping looks like
          </Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="relative mt-6 flex flex-col items-center gap-3"
      >
        <span className="text-xs text-muted-foreground tracking-wide uppercase">Try a color</span>
        <TooltipProvider delayDuration={200}>
          <div className="relative flex gap-3" data-swatch-container>
            {(Object.entries(themePresets) as [ThemePreset, typeof themePresets[ThemePreset]][]).map(([key, preset], index) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: theme === key ? 1 : 0.7, scale: theme === key ? 1.1 : 1 }}
                    transition={{ duration: 0.4, delay: 1.0 + index * 0.1 }}
                    whileHover={{ scale: 1.1, opacity: 1 }}
                    onClick={(e) => {
                      spawnParticles(e, `hsl(${preset.glowPrimary})`);
                      playSwatchPop();
                      setTheme(key);
                    }}
                    aria-label={`${preset.name} theme`}
                    className={`w-7 h-7 rounded-full border-2 border-border/40 ${
                      theme === key
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                        : ''
                    }`}
                    style={{
                      backgroundColor: `hsl(${preset.glowPrimary})`,
                      color: `hsl(${preset.glowPrimary})`,
                      animation: theme === key ? 'glow-pulse 2s ease-in-out infinite' : undefined,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {preset.name}
                </TooltipContent>
              </Tooltip>
            ))}

            {particles.map(p => (
              <span
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: p.x,
                  top: p.y,
                  width: 4,
                  height: 4,
                  backgroundColor: p.color,
                  boxShadow: `0 0 6px 2px ${p.color}`,
                  '--sx': `${p.dx}px`,
                  '--sy': `${p.dy}px`,
                  animation: 'sparkle-burst 0.6s ease-out forwards',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </TooltipProvider>
      </motion.div>
    </section>
  );
}
