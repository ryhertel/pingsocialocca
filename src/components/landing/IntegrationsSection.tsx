import { useNavigate } from 'react-router-dom';
import {
  Webhook, CreditCard, Github, MessageSquare, Gamepad2,
  SquareKanban, Bug, Triangle, Plug, BookOpen, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const integrations = [
  { icon: Bot, name: 'OpenClaw', desc: 'Local AI agent bridge. Connect your own agent over WebSocket.', featured: true },
  { icon: Webhook, name: 'Generic Webhook', desc: 'Any HTTP service, Zapier, Make, n8n, or curl' },
  { icon: CreditCard, name: 'Stripe', desc: 'Payments, subscriptions & revenue events' },
  { icon: Github, name: 'GitHub', desc: 'Pushes, deployments, issues & PRs' },
  { icon: MessageSquare, name: 'Slack', desc: 'Messages, mentions & channel alerts' },
  { icon: Gamepad2, name: 'Discord', desc: 'Server events, messages & bot alerts' },
  { icon: SquareKanban, name: 'Linear', desc: 'Issues, project updates & workflow' },
  { icon: Bug, name: 'Sentry', desc: 'Errors, crashes & production incidents' },
  { icon: Triangle, name: 'Vercel', desc: 'Deploys, build failures & CI/CD' },
] as const;

export function IntegrationsSection() {
  const navigate = useNavigate();

  return (
    <section id="integrations" className="py-20 px-6 border-t border-border/20 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Connects to the tools you already use
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
          9 pre-built connectors with setup guides, cURL builders, and test
          events. Or use the generic webhook for anything else.
        </p>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {integrations.map((item, idx) => {
            const isFeatured = 'featured' in item && item.featured;
            return (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(`/docs#${item.name.toLowerCase().replace(/\s/g, '')}`)}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border p-5 transition-colors text-center ${
                  isFeatured
                    ? 'col-span-2 sm:col-span-2 border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.2)]'
                    : 'border-border/30 bg-card/30 hover:border-primary/30 hover:bg-card/60'
                }`}
              >
                {isFeatured && (
                  <span className="absolute top-2.5 right-3 text-[9px] font-semibold uppercase tracking-widest text-primary/70">
                    Recommended
                  </span>
                )}
                <div className={`rounded-lg flex items-center justify-center transition-colors ${
                  isFeatured
                    ? 'h-12 w-12 bg-primary/15 group-hover:bg-primary/25'
                    : 'h-10 w-10 bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <item.icon className={`text-primary ${isFeatured ? 'h-6 w-6' : 'h-5 w-5'}`} />
                </div>
                <div>
                  <p className={`font-medium ${isFeatured ? 'text-base' : 'text-sm'}`}>{item.name}</p>
                  <p className={`text-muted-foreground mt-0.5 leading-snug ${isFeatured ? 'text-xs' : 'text-[11px]'}`}>{item.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 mt-10">
          <Button variant="outline" onClick={() => navigate('/connectors')} className="gap-2">
            <Plug className="h-4 w-4" /> Browse Connectors
          </Button>
          <Button variant="outline" onClick={() => navigate('/docs')} className="gap-2">
            <BookOpen className="h-4 w-4" /> Integration Docs
          </Button>
        </div>
      </div>
    </section>
  );
}
