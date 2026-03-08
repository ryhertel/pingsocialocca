import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import pingLogo from '@/assets/ping-logo-white.png';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  { id: 'how-it-works', label: 'How It Works', fallback: '/docs' },
  { id: 'features', label: 'Features', fallback: '/docs' },
  { id: 'integrations', label: 'Integrations', fallback: '/connectors' },
] as const;

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function useActiveSection(sectionIds: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}

export function LandingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const activeSection = useActiveSection(NAV_SECTIONS.map((s) => s.id));

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  const setButtonRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) buttonRefs.current.set(id, el);
    else buttonRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!isLanding || !activeSection || !containerRef.current) {
      setUnderline(null);
      return;
    }
    const btn = buttonRefs.current.get(activeSection);
    if (!btn) { setUnderline(null); return; }

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setUnderline({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeSection, isLanding]);

  const handleNav = (sectionId: string, fallbackRoute: string) => {
    if (isLanding) {
      scrollToSection(sectionId);
    } else {
      navigate(fallbackRoute);
    }
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <button onClick={() => isLanding ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate('/')}>
          <img src={pingLogo} alt="Ping" className="h-7 opacity-90" />
        </button>
        <div ref={containerRef} className="relative flex items-center gap-2 sm:gap-4">
          {/* Sliding underline */}
          <span
            className={cn(
              'absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out',
              underline ? 'opacity-100' : 'opacity-0',
            )}
            style={underline ? {
              left: underline.left,
              width: underline.width,
              boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.5), 0 0 16px 4px hsl(var(--primary) / 0.25)',
            } : { left: 0, width: 0 }}
          />

          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              ref={(el) => setButtonRef(s.id, el)}
              onClick={() => handleNav(s.id, s.fallback)}
              className={cn(
                'text-sm pb-1 transition-colors hidden sm:inline',
                isLanding && activeSection === s.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => navigate('/docs')}
            className="text-sm pb-1 text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            Docs
          </button>
          <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5">
            Launch App <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}