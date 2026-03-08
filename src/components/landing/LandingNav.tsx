import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
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
          // pick the one closest to the top
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
        <div className="flex items-center gap-2 sm:gap-4">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleNav(s.id, s.fallback)}
              className={cn(
                'text-sm transition-colors hidden sm:inline',
                isLanding && activeSection === s.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => navigate('/docs')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
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