import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import pingLogo from '@/assets/ping-logo-white.png';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/useSettingsStore';

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
  const overrideRef = useRef<string | null>(null);
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forceActive = useCallback((id: string) => {
    overrideRef.current = id;
    setActive(id);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => {
      overrideRef.current = null;
    }, 1200);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (overrideRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -40% 0px', threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return { active, forceActive };
}

export function LandingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { colorMode, setColorMode } = useSettingsStore();
  const isDark = colorMode === 'dark' || (colorMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const sectionIds = useMemo(() => NAV_SECTIONS.map((s) => s.id), []);
  const { active: activeSection, forceActive } = useActiveSection(sectionIds);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const setButtonRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) buttonRefs.current.set(id, el);
    else buttonRefs.current.delete(id);
  }, []);

  const updateUnderline = useCallback(() => {
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

  useEffect(() => {
    updateUnderline();
    window.addEventListener('resize', updateUnderline);
    return () => window.removeEventListener('resize', updateUnderline);
  }, [updateUnderline]);

  const handleNav = (sectionId: string, fallbackRoute: string) => {
    if (isLanding) {
      forceActive(sectionId);
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
          <button
            onClick={() => setColorMode(isDark ? 'light' : 'dark')}
            className="hidden sm:inline-flex p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://github.com/ryhertel/pingsocialocca"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center"
          >
            <img 
              src="https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social" 
              alt="GitHub stars" 
              className="h-5"
            />
          </a>
          <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5 hidden sm:flex">
            Launch App <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="sm:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="flex flex-col gap-4">
                {NAV_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSheetOpen(false);
                      handleNav(s.id, s.fallback);
                    }}
                    className={cn(
                      'text-left text-base py-2 transition-colors',
                      isLanding && activeSection === s.id
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => { setSheetOpen(false); navigate('/docs'); }}
                  className="text-left text-base py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Docs
                </button>
                <button
                  onClick={() => setColorMode(isDark ? 'light' : 'dark')}
                  className="flex items-center gap-2 text-left text-base py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <a
                  href="https://github.com/ryhertel/pingsocialocca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-base py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Star on GitHub
                  <img 
                    src="https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social" 
                    alt="GitHub stars" 
                    className="h-5"
                  />
                </a>
                <Button onClick={() => { setSheetOpen(false); navigate('/app'); }} className="gap-1.5 mt-4">
                  Launch App <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}