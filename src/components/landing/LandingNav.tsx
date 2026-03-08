import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pingLogo from '@/assets/ping-logo-white.png';

export function LandingNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <img src={pingLogo} alt="Ping" className="h-7 opacity-90" />
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/docs')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            Docs
          </button>
          <button
            onClick={() => navigate('/connectors')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
          >
            Connectors
          </button>
          <Button size="sm" onClick={() => navigate('/app')} className="gap-1.5">
            Launch App <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
