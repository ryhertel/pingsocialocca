import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Sparkles, ShieldAlert, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useIngestStore, getWebhookUrl } from '@/stores/useIngestStore';
import { claimChannel, rotateEmailAlias, emailAddressFor } from '@/lib/ingest/privateReadClient';
import { stopAmbientReel } from '@/lib/demoScriptEngine';

interface ClaimChannelModalProps {
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

export function ClaimChannelModal({ open, onOpenChange }: ClaimChannelModalProps) {
  const [label, setLabel] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [rotating, setRotating] = useState(false);
  const adoptChannel = useIngestStore((s) => s.adoptChannel);
  const setEmailAlias = useIngestStore((s) => s.setEmailAlias);
  const writeToken = useIngestStore((s) => s.writeToken);
  const channelKey = useIngestStore((s) => s.channelKey);
  const emailAlias = useIngestStore((s) => s.emailAlias);

  const claimed = writeToken.length > 0;
  const webhookUrl = getWebhookUrl();
  // Empty when this deployment has no mail domain configured, in which case the
  // whole email section stays hidden rather than showing a broken address.
  const emailAddress = emailAddressFor(emailAlias);

  const handleRotateEmail = async () => {
    setRotating(true);
    const fresh = await rotateEmailAlias(channelKey, writeToken);
    setRotating(false);
    if (!fresh) {
      toast.error('Could not issue a new address. Try again in a moment.');
      return;
    }
    setEmailAlias(fresh);
    toast.success('New address issued — the old one stops working now.');
  };
  const curl = `curl -X POST "${webhookUrl}" \\\n  -H "content-type: application/json" \\\n  -d '{"title":"Hello from Ping"}'`;

  const handleClaim = async () => {
    setClaiming(true);
    const result = await claimChannel(label.trim() || undefined);
    setClaiming(false);
    if (!result) {
      toast.error('Could not create a channel. Try again in a moment.');
      return;
    }
    // The demo stops here: from now on the eyes react to real events.
    stopAmbientReel();
    adoptChannel(result);
    toast.success('Channel ready — paste the URL into any webhook.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--ping-accent))]" />
            {claimed ? 'Your webhook URL' : 'Make it yours'}
          </DialogTitle>
        </DialogHeader>

        {!claimed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get your own channel and a webhook URL you can paste straight into GitHub, Stripe,
              Vercel or a shell script. No account, nothing to install.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="channel-label" className="text-xs">Name it (optional)</Label>
              <Input
                id="channel-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="my laptop"
                maxLength={40}
              />
            </div>

            <Button onClick={handleClaim} disabled={claiming} className="w-full">
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create my channel'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Point any webhook here. Ping understands GitHub, Stripe and Vercel payloads as they
              come — no middleware in between.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs">Webhook URL</Label>
              <div className="flex items-center gap-1">
                <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1.5 text-[11px] font-mono">
                  {webhookUrl}
                </code>
                <CopyButton text={webhookUrl} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Try it now</Label>
              <div className="flex items-start gap-1">
                <pre className="flex-1 overflow-x-auto rounded bg-muted/40 px-2 py-1.5 text-[11px] font-mono">
                  {curl}
                </pre>
                <CopyButton text={curl} />
              </div>
            </div>

            {emailAddress && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  Or email it
                </Label>
                <div className="flex items-center gap-1">
                  <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1.5 text-[11px] font-mono">
                    {emailAddress}
                  </code>
                  <CopyButton text={emailAddress} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotateEmail}
                    disabled={rotating}
                    title="Issue a new address and stop the old one"
                    className="h-7 w-7 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rotating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  For anything that can send email but not webhooks. The subject becomes the
                  title. Anyone who knows this address can post to your feed, so rotate it if it
                  gets out.
                </p>
              </div>
            )}

            <div className="flex gap-2 rounded-md border border-[hsl(var(--ping-warning))]/30 bg-[hsl(var(--ping-warning))]/10 p-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[hsl(var(--ping-warning))]" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This URL carries a write token, because most webhook forms cannot send custom
                headers. It only lets someone post events to your own feed — but treat it like a
                password and rotate it if it ends up somewhere public.
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Channel <code className="font-mono">{channelKey.slice(0, 8)}…</code> is stored in this
              browser.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
