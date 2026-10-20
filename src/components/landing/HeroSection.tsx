import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { DeviceShell } from './DeviceShell';
import { motion, useAnimation } from 'framer-motion';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import type { ThemePreset } from '@/lib/types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { playSwatchPop } from '@/lib/audio';
import { useHaptics } from '@/hooks/useHaptics';

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
  const { theme, setTheme, volume, muted, dnd } = useSettingsStore();
  const [particles, setParticles] = useState<Particle[]>([]);
  const { vibrate } = useHaptics();
  const faceControls = useAnimation();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      faceControls.start({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] } });
      hasMounted.current = true;
      return;
    }
    faceControls.start({ scale: [1, 1.02, 1], transition: { duration: 0.25, ease: 'easeOut' } });
  }, [theme, faceControls]);

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
    <section className="relative pt-36 sm:pt-40 pb-16 px-5 sm:px-8">
      <div
        className="absolute top-24 right-[8%] w-[560px] h-[420px] rounded-full opacity-[0.14] blur-[120px] pointer-events-none transition-[background] duration-400 ease-in-out"
        style={{ background: 'radial-gradient(circle, hsl(var(--glow-primary)), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto grid items-center gap-14 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-7">
          <div className="inline-flex items-center gap-2.5 h-7 px-3 rounded-lg border border-border/60 font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" aria-hidden="true" />
            OPEN SOURCE · NOTIFICATION FACE
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-bold leading-[0.98] tracking-[-0.045em] max-w-2xl">
            Give your notifications <span className="text-primary">a face.</span>
          </h1>

          <p className="text-lg sm:text-[19px] text-muted-foreground max-w-xl leading-relaxed">
            A pair of eyes that reacts to whatever you point at it. Send a deploy, a
            payment, an alert or a line of text, and Ping answers with an expression,
            a sound and a burst of colour — in real time.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => navigate('/app')} className="gap-2">
              Launch app <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/docs')}>
              Read the docs
            </Button>
          </div>

          <p className="font-mono text-xs text-muted-foreground/80 tracking-[0.02em]">
            No account · one webhook URL · one email address per channel
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full max-w-[500px] mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={faceControls} className="w-full">
            <DeviceShell caption="live preview">
              <FaceCanvas eyeScale={2} />
            </DeviceShell>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.6 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">LED COLOUR</span>
            <TooltipProvider delayDuration={200}>
              <div className="relative flex gap-3" data-swatch-container>
                {(Object.entries(themePresets) as [ThemePreset, typeof themePresets[ThemePreset]][]).map(([key, preset], index) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: 8, scale: 0.6 }}
                        animate={{ opacity: theme === key ? 1 : 0.7, y: 0, scale: theme === key ? 1.1 : 1 }}
                        transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                        whileHover={{ scale: 1.1, opacity: 1 }}
                        onClick={(e) => {
                          vibrate('tap');
                          spawnParticles(e, `hsl(${preset.glowPrimary})`);
                          playSwatchPop(volume, muted, dnd);
                          setTheme(key);
                        }}
                        aria-label={`${preset.name} LED colour`}
                        aria-pressed={theme === key}
                        className={`w-7 h-7 rounded-full border-2 border-border/40 ${
                          theme === key ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
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
        </div>
      </div>
    </section>
  );
}
