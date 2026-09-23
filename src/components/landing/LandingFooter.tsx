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

const SOCIALOCCA_URL = 'https://socialocca.com';

/**
 * Taken from socialocca.com's own navigation rather than guessed. The site is a
 * SPA with a catch-all route, so every path returns 200 — including ones that do
 * not exist. `/privacy` and `/terms` look fine to a status check and are wrong.
 */
const COMPANY_LINKS = [
  { label: 'Socialocca', href: SOCIALOCCA_URL },
  { label: 'Contact', href: `${SOCIALOCCA_URL}/contact` },
  { label: 'Privacy Policy', href: `${SOCIALOCCA_URL}/privacy-policy` },
  { label: 'Terms', href: `${SOCIALOCCA_URL}/terms-of-service` },
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <img src={pingLogo} alt="Ping" className="h-6 opacity-80 mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Give your notifications a face. Point a webhook at Ping and watch it react —
              open source, no account needed.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed mb-1">
              A product by{' '}
              <a
                href={SOCIALOCCA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Socialocca
              </a>
            </p>
            <a
              href={SOCIALOCCA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              socialocca.com
              <ExternalLink className="h-3 w-3" />
            </a>

            <a
              href="https://github.com/ryhertel/pingsocialocca"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              Star us on GitHub
              <img
                src="https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social"
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

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Ping — a Socialocca product</span>
          <div className="flex items-center gap-4">
            <a
              href={`${SOCIALOCCA_URL}/privacy-policy`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href={`${SOCIALOCCA_URL}/terms-of-service`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </a>
            <a
              href={SOCIALOCCA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              socialocca.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
