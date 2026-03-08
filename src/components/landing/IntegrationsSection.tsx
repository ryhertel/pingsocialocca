import { useNavigate } from 'react-router-dom';
import {
  Webhook, CreditCard, Github, MessageSquare, Gamepad2,
  SquareKanban, Bug, Triangle, Plug, BookOpen, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const integrations = [
  { icon: Bot, name: 'OpenClaw', desc: 'Local AI agent bridge. Connect your own agent over WebSocket.' },
  { icon: Webhook, name: 'Generic Webhook', desc: 'Any HTTP service, Zapier, Make, n8n, or curl' },
  { icon: CreditCard, name: 'Stripe', desc: 'Payments, subscriptions & revenue events' },
  { icon: Github, name: 'GitHub', desc: 'Pushes, deployments, issues & PRs' },
  { icon: MessageSquare, name: 'Slack', desc: 'Messages, mentions & channel alerts' },
  { icon: Gamepad2, name: 'Discord', desc: 'Server events, messages & bot alerts' },
  { icon: SquareKanban, name: 'Linear', desc: 'Issues, project updates & workflow' },
  { icon: Bug, name: 'Sentry', desc: 'Errors, crashes & production incidents' },
  { icon: Triangle, name: 'Vercel', desc: 'Deploys, build failures & CI/CD' },
];

export function IntegrationsSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Connects to the tools you already use
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
          9 pre-built connectors with setup guides, cURL builders, and test
          events. Or use the generic webhook for anything else.
        </p>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {integrations.map((item, idx) => (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(`/docs#${item.name.toLowerCase().replace(/\s/g, '')}`)}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border/30 bg-card/30 p-5 hover:border-primary/30 hover:bg-card/60 transition-colors text-center"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </motion.button>
          ))}
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
