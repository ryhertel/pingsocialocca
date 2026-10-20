import { useState } from 'react';
import { Check, Copy, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIngestStore } from '@/stores/useIngestStore';
import { emailAddressFor, getEmailDomain, rotateEmailAlias } from '@/lib/ingest/privateReadClient';
import { cn } from '@/lib/utils';

/**
 * A channel's inbound email address, with the three ways people actually use
 * it. Email reaches the things webhooks cannot — receipts, alerts from consumer
 * apps, anything with a "notify me by email" box — so it has to be obvious how.
 *
 * Renders nothing until a channel is claimed, or when this deployment has no
 * mail domain, rather than showing an address that cannot receive anything.
 */

const USES = [
  { title: 'Forward anything', desc: 'Send any email to this address and Ping reacts to it.' },
  { title: 'Auto-forward with a filter', desc: 'In Gmail or Outlook, add a rule that forwards receipts or alerts here.' },
  { title: 'Use it as an alert address', desc: 'Paste it into any service with an “email me when…” setting.' },
];

export function EmailInCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  const channelKey = useIngestStore((s) => s.channelKey);
  const writeToken = useIngestStore((s) => s.writeToken);
  const emailAlias = useIngestStore((s) => s.emailAlias);
  const setEmailAlias = useIngestStore((s) => s.setEmailAlias);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!getEmailDomain() || !writeToken) return null;
  const address = emailAddressFor(emailAlias);

  // Issues a first address for channels claimed before email-in existed, or
  // replaces a leaked one. Either way the old address stops working at once.
  const issueAddress = async () => {
    setBusy(true);
    const fresh = await rotateEmailAlias(channelKey, writeToken);
    setBusy(false);
    if (!fresh) {
      toast.error('Could not issue an address. Try again in a moment.');
      return;
    }
    setEmailAlias(fresh);
    toast.success(address ? 'New address issued. The old one has stopped working.' : 'Your email address is ready.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy. Select the address and copy it instead.');
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        EMAIL-IN
      </div>

      {address ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-1.5 pl-3">
          <code className="flex-1 min-w-0 truncate font-mono text-xs text-foreground select-text">{address}</code>
          <Button size="sm" onClick={copy} className="h-8 gap-1.5 shrink-0" aria-label="Copy email address">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={issueAddress}
            disabled={busy}
            className="h-8 w-8 p-0 shrink-0"
            aria-label="Issue a new address and stop the old one"
            title="Issue a new address and stop the old one"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={issueAddress} disabled={busy} className="gap-2 self-start">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Get an email address
        </Button>
      )}

      {!compact && address && (
        <>
          <ol className="flex flex-col gap-2.5">
            {USES.map((u, i) => (
              <li key={u.title} className="flex gap-3">
                <span className="font-mono text-xs text-primary tabular-nums pt-px">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs leading-relaxed">
                  <span className="font-medium text-foreground">{u.title}.</span>{' '}
                  <span className="text-muted-foreground">{u.desc}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            The subject becomes what you see. Replies, signatures and “sent from my phone”
            lines are stripped, and the sender’s domain shows as a tag. Anyone with this
            address can post to your feed, so use the refresh button if it ever leaks.
          </p>
        </>
      )}
    </div>
  );
}
