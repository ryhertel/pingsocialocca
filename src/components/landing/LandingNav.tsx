import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pingLogo from '@/assets/ping-logo-white.png';

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function LandingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

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
          <button
            onClick={() => handleNav('how-it-works', '/docs')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            How It Works
          </button>
          <button
            onClick={() => handleNav('features', '/docs')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            Features
          </button>
          <button
            onClick={() => handleNav('integrations', '/connectors')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            Integrations
          </button>
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
