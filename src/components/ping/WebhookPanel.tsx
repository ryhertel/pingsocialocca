import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useIngestStore, getIngestUrlWithKey } from '@/stores/useIngestStore';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import { executeReaction } from '@/lib/ingest/reactionExecutor';
import { Copy, Check, Send, Trash2, RefreshCw, AlertTriangle, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function maskSecret(s: string): string {
  if (s.length <= 6) return '••••••';
  return '••••••' + s.slice(-6);
}

function maskKey(s: string): string {
  if (s.length <= 8) return '••••••••';
  return s.slice(0, 4) + '••••' + s.slice(-4);
}

export function WebhookPanel({ open, onOpenChange }: WebhookPanelProps) {
  const {
    ingestSecret, rememberSecret, connected, showBodyPreview, channelKey, secureStreamConnected,
    setSecret, setRememberSecret, clearSecret, regenerateSecret, disconnect,
    pushEvent,
  } = useIngestStore();

  const navigate = useNavigate();
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showChannelKey, setShowChannelKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [regeneratedValue, setRegeneratedValue] = useState<string | null>(null);

  const ingestUrl = getIngestUrlWithKey();

  const handleSetSecret = () => {
    if (secretInput.trim()) {
      setSecret(secretInput.trim());
      setSecretInput('');
    }
  };

  const handleRegenerate = () => {
    const newVal = regenerateSecret();
    setRegeneratedValue(newVal);
  };

  const handleTestEvent = async () => {
    if (!ingestUrl || !ingestSecret) return;
    setTesting(true);
    try {
      const testId = crypto.randomUUID();
      const payload = {
        id: testId,
        source: 'ping-test',
        eventType: 'success',
        title: 'Test event from Ping UI',
        body: 'Hello from the test button!',
      };
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

  const curlExample = `curl -X POST "${ingestUrl || 'https://<project>.supabase.co/functions/v1/ingest?key=<channelKey>'}" \\
  -H "Content-Type: application/json" \\
  -H "x-ping-secret: YOUR_SECRET" \\
  -d '{
    "source":"custom",
    "eventType":"success",
    "title":"Test event",
    "body":"Hello from curl"
  }'`;

  const jsonExample = JSON.stringify({
    source: 'zapier',
    eventType: 'success',
    title: 'New sale completed',
    body: 'Order #1234 — $49.99',
  }, null, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-[340px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-semibold">Webhooks</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Secure Stream Status */}
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${secureStreamConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-muted-foreground">
              Secure stream: {secureStreamConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/60">
            Events are private; this device must be authorized to read.
          </p>

          {/* Ingest URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ingest URL (with channel key)</Label>
            <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/30">
              <code className="text-[10px] text-foreground font-mono break-all flex-1">
                {ingestUrl || 'Not available'}
              </code>
              {ingestUrl && <CopyButton text={ingestUrl} />}
            </div>
          </div>

          {/* Channel Key */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Channel Key</Label>
            <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/30">
              <code className="text-[10px] text-foreground font-mono flex-1">
                {showChannelKey ? channelKey : maskKey(channelKey)}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setShowChannelKey(!showChannelKey)} className="h-7 w-7 shrink-0">
                {showChannelKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <CopyButton text={channelKey} />
            </div>
            <p className="text-[9px] text-muted-foreground/60">
              Scopes events to this Ping instance. Included in the ingest URL.
            </p>
          </div>

          {/* Secret */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ingest Secret</Label>
            {ingestSecret ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/30">
                  <code className="text-[10px] text-foreground font-mono flex-1">
                    {showSecret ? ingestSecret : maskSecret(ingestSecret)}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)} className="h-7 w-7 shrink-0">
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <CopyButton text={ingestSecret} />
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={clearSecret} className="text-xs gap-1 flex-1">
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRegenerate} className="text-xs gap-1 flex-1">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Input
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Paste your secret"
                  className="bg-muted/40 border-border/50 font-mono text-xs"
                />
                <Button size="sm" onClick={handleSetSecret} disabled={!secretInput.trim()}>
                  Set
                </Button>
              </div>
            )}

            {regeneratedValue && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                <p className="text-[10px] text-foreground font-medium">New secret generated</p>
                <p className="text-[10px] text-muted-foreground">
                  Copy this value and update it in your backend secrets as <code className="text-foreground">PING_INGEST_SECRET</code>.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-[10px] p-0 h-auto"
                  onClick={() => setRegeneratedValue(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          {/* Remember toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Remember secret on this device</Label>
            <Switch checked={rememberSecret} onCheckedChange={setRememberSecret} />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              Your ingest secret is sensitive. Anyone with it can send events to Ping.
            </p>
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

          {/* Show body preview toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Show body preview in feed</Label>
            <Switch
              checked={showBodyPreview}
              onCheckedChange={(v) => useIngestStore.setState({ showBodyPreview: v })}
            />
          </div>

          {/* Browse Connectors */}
          <Button
            variant="outline"
            className="w-full gap-2 text-xs"
            onClick={() => { onOpenChange(false); navigate('/connectors'); }}
          >
            <LayoutGrid className="h-4 w-4" />
            Browse connector templates
          </Button>

          {/* Curl example */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Example curl</Label>
              <CopyButton text={curlExample} />
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>

          {/* JSON example */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Quick Payload (Zapier/Make)</Label>
              <CopyButton text={jsonExample} />
            </div>
            <pre className="text-[9px] font-mono text-muted-foreground bg-muted/20 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {jsonExample}
            </pre>
          </div>

          {/* Disconnect */}
          <Button
            variant="destructive"
            onClick={() => { disconnect(); onOpenChange(false); }}
            className="w-full"
          >
            Disconnect
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
