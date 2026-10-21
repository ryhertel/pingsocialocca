import { Link } from 'react-router-dom';
import {
  Webhook, CreditCard, Github, MessageSquare, Gamepad2,
  SquareKanban, Bug, Triangle, Plug, BookOpen, Bot, Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import type { ConnectorTransport } from '@/lib/connectors/types';
import { SectionHeader } from './SectionHeader';
import { cn } from '@/lib/utils';

// Same names as the template icons, so a card can never drift from its connector.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Webhook, CreditCard, Github, MessageSquare, Gamepad2, SquareKanban, Bug, Triangle, Bot, Activity,
};

/** How each connector reaches Ping, said the way a spec sheet would. */
const TRANSPORT: Record<ConnectorTransport, string> = {
  direct: 'DIRECT',
  generic: 'ANY HTTP',
  middleware: 'VIA APP',
  bridge: 'LOCAL',
};

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-24 px-5 sm:px-8 scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <SectionHeader label={`CONNECTORS · ${String(connectorTemplates.length).padStart(2, '0')}`} title="Connects to the tools you already use.">
          Each has a setup guide and a test event. DIRECT means you paste one URL into the
          service and you are done.
        </SectionHeader>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {connectorTemplates.map((t, idx) => {
            const Icon = ICONS[t.icon] ?? Webhook;
            const featured = t.transport === 'generic';
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className={cn(featured && 'col-span-2 lg:col-span-1')}
              >
                <Link
                  to={`/docs#${t.id}`}
                  className={cn(
                    'flex h-full items-start gap-4 rounded-[22px] border p-5 transition-[border-color,transform] duration-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    featured ? 'border-primary/40 bg-primary/[0.06] hover:border-primary/60' : 'border-border/60 bg-card hover:border-primary/30',
                  )}
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{t.name}</span>
                      <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">{TRANSPORT[t.transport]}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{t.description}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-10">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/connectors"><Plug className="h-4 w-4" /> Browse connectors</Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/docs"><BookOpen className="h-4 w-4" /> Integration docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
