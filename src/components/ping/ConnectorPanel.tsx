import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIngestStore, getIngestUrlWithKey } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import { Copy, Check, Send, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { ConnectorTemplate } from '@/lib/connectors/types';

interface ConnectorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ConnectorTemplate | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function ConnectorPanel({ open, onOpenChange, template }: ConnectorPanelProps) {
  const ingestSecret = useIngestStore((s) => s.ingestSecret);
  const secureStreamConnected = useIngestStore((s) => s.secureStreamConnected);
  const pushEvent = useIngestStore((s) => s.pushEvent);
  const [testing, setTesting] = useState(false);

  if (!template) return null;

  const ingestUrl = getIngestUrlWithKey();

  const handleTestEvent = async () => {
    if (!ingestUrl || !ingestSecret) {
      toast.error('Set your ingest secret first (Webhooks panel)');
      return;
    }
    setTesting(true);
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
      setTesting(false);
    }
  };

  const curlExample = `curl -X POST "${ingestUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-ping-secret: YOUR_SECRET" \\
  -d '${JSON.stringify(template.testEvent, null, 2)}'`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-[340px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-semibold">{template.name} Setup</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Setup Steps */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Setup Steps</p>
            <ol className="space-y-2">
              {template.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Ingest URL */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Ingest URL (with channel key)</p>
            <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/30">
              <code className="text-[10px] text-foreground font-mono break-all flex-1">
                {ingestUrl || 'Not available'}
              </code>
              {ingestUrl && <CopyButton text={ingestUrl} />}
            </div>
          </div>

          {/* Required Headers */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Required Headers</p>
            <div className="p-2 rounded-lg bg-muted/20 space-y-1">
              <code className="text-[10px] font-mono text-foreground block">Content-Type: application/json</code>
              <code className="text-[10px] font-mono text-foreground block">x-ping-secret: YOUR_SECRET</code>
            </div>
          </div>

          {/* Example Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Example Payload</p>
              <CopyButton text={JSON.stringify(template.testEvent, null, 2)} />
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(template.testEvent, null, 2)}
            </pre>
          </div>

          {/* Curl Example */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Example curl</p>
              <CopyButton text={curlExample} />
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Supported Keywords</p>
            <div className="flex flex-wrap gap-1">
              {template.keywordsSupported.map((kw) => (
                <Badge key={kw} variant="outline" className="text-[9px] px-1.5 py-0">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>

          {/* Test Event */}
          <Button
            onClick={handleTestEvent}
            disabled={!ingestSecret || !ingestUrl || testing}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {testing ? 'Sending…' : 'Send Test Event'}
          </Button>

          {/* Secure Stream Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`h-2 w-2 rounded-full ${secureStreamConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-muted-foreground">
              Secure stream: {secureStreamConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Notes</p>
            <p className="text-[10px] text-muted-foreground">{template.notes}</p>
          </div>

          {/* Security */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" /> Security
            </p>
            <p className="text-[10px] text-muted-foreground">{template.securityCopy}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
