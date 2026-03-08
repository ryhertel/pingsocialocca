import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIngestStore, getIngestUrlWithKey } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import { ConnectorPanel } from '@/components/ping/ConnectorPanel';
import { connectorTemplates } from '@/lib/connectors/connectorTemplates';
import type { ConnectorTemplate } from '@/lib/connectors/types';
import {
  ArrowLeft, Webhook, CreditCard, Github, Send, Copy, Check, Eye, EyeOff, Bot,
} from 'lucide-react';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Webhook,
  CreditCard,
  Github,
  Bot,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="h-7 w-7 shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function maskKey(s: string): string {
  if (s.length <= 8) return '••••••••';
  return s.slice(0, 4) + '••••' + s.slice(-4);
}

export default function Connectors() {
  const navigate = useNavigate();
  const channelKey = useIngestStore((s) => s.channelKey);
  const ingestSecret = useIngestStore((s) => s.ingestSecret);
  const secureStreamConnected = useIngestStore((s) => s.secureStreamConnected);
  const pushEvent = useIngestStore((s) => s.pushEvent);
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const ingestUrl = getIngestUrlWithKey();

  const handleTestEvent = async (template: ConnectorTemplate) => {
    if (!ingestUrl || !ingestSecret) {
      toast.error('Set your ingest secret first (Webhooks panel on main page)');
      return;
    }
    setTestingId(template.id);
    try {
      const testId = crypto.randomUUID();
      const payload = { id: testId, ...template.testEvent };
      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ping-secret': ingestSecret,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok && data.event) {
        if (!secureStreamConnected) {
          pushEvent(data.event);
          const reaction = routeEvent(data.event);
          executeReaction(reaction);
          toast.info('Secure stream disconnected: showing local preview only');
        } else {
          toast.success('Event received via secure stream!');
        }
      } else {
        toast.error(data.error || 'Test event failed');
      }
    } catch {
      toast.error('Failed to send test event');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Connectors</h1>
          <p className="text-xs text-muted-foreground">Connect external services to Ping</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${secureStreamConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-[10px] text-muted-foreground">
            {secureStreamConnected ? 'Secure' : 'Offline'}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Channel Key */}
        <div className="p-3 rounded-lg bg-card border border-border/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Channel Key</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="h-7 w-7">
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <CopyButton text={channelKey} />
            </div>
          </div>
          <code className="text-[10px] font-mono text-foreground block">
            {showKey ? channelKey : maskKey(channelKey)}
          </code>
          <p className="text-[9px] text-muted-foreground/60">
            Included in your ingest URL. Scopes events to this Ping instance.
          </p>
        </div>

        {/* Connector Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectorTemplates.map((template) => {
            const Icon = ICON_MAP[template.icon] ?? Webhook;
            return (
              <div
                key={template.id}
                className="p-4 rounded-xl bg-card border border-border/30 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{template.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setSelectedTemplate(template); setPanelOpen(true); }}
                  >
                    Setup
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => handleTestEvent(template)}
                    disabled={testingId === template.id || !ingestSecret}
                  >
                    <Send className="h-3 w-3" />
                    {testingId === template.id ? 'Sending…' : 'Test'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {!ingestSecret && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs text-muted-foreground">
              Set your ingest secret in the Webhooks panel (main page) before testing connectors.
            </p>
          </div>
        )}
      </div>

      <ConnectorPanel open={panelOpen} onOpenChange={setPanelOpen} template={selectedTemplate} />
    </div>
  );
}
