import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink, Github } from 'lucide-react';
import pingLogo from '@/assets/ping-logo-white.png';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';

const PRODUCT_LINKS = [
  { label: 'Launch App', to: '/app' },
  { label: 'Connectors', to: '/connectors' },
  { label: 'How It Works', anchor: 'how-it-works' },
  { label: 'Features', anchor: 'features' },
  { label: 'Integrations', anchor: 'integrations' },
];

const DOCS_LINKS = [
  { label: 'Integration Guide', to: '/docs' },
  { label: 'Event Schema', to: '/docs#schema' },
  { label: 'Troubleshooting', to: '/docs#troubleshooting' },
];

export function LandingFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const handleNav = (link: { to?: string; anchor?: string }) => {
    if (link.anchor) {
      if (isLanding) {
        document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(`/#${link.anchor}`);
      }
    } else if (link.to) {
      navigate(link.to);
    }
  };

  return (
    <footer className="border-t border-border/30 bg-background/50">
      <div className="max-w-6xl mx-auto px-6 py-14">
        {/* Top: Brand + Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <img src={pingLogo} alt="Ping" className="h-6 opacity-80 mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Open-source presence UI for AI agents.
            </p>
            <a
              href="https://socialocca.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Made with <span className="text-red-400">♥</span> by socialocca.io
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/socialocca/ping"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              Star us on GitHub
              <img 
                src="https://img.shields.io/github/stars/socialocca/ping?style=social" 
                alt="GitHub stars" 
                className="h-5"
              />
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Product</h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNav(link)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Docs */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Docs</h4>
            <ul className="space-y-2.5">
              {DOCS_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNav(link)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Connectors */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Connectors</h4>
            <ul className="space-y-2.5">
              {connectorTemplates.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/docs#${c.id}`)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
              {connectorTemplates.length > 6 && (
                <li>
                  <button
                    onClick={() => navigate('/connectors')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View all →
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Ping</span>
          <a
            href="https://socialocca.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Made by socialocca.io
          </a>
        </div>
      </div>
    </footer>
  );
}
