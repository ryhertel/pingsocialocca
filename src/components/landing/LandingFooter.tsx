import { useNavigate } from 'react-router-dom';
import pingLogo from '@/assets/ping-logo-white.png';

export function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border/30 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={pingLogo} alt="Ping" className="h-5 opacity-60" />
          <span>&copy; {new Date().getFullYear()} Ping</span>
        </div>
        <div className="flex gap-6">
          <button onClick={() => navigate('/app')} className="hover:text-foreground transition-colors">App</button>
          <button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">Docs</button>
          <button onClick={() => navigate('/connectors')} className="hover:text-foreground transition-colors">Connectors</button>
          <button onClick={() => navigate('/docs#troubleshooting')} className="hover:text-foreground transition-colors">Troubleshooting</button>
        </div>
      </div>
    </footer>
  );
}
