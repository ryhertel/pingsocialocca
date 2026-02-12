import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useIngestStore } from '@/stores/useIngestStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2, Circle, Shield } from 'lucide-react';

interface DiagnosticsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={color || 'text-foreground font-medium'}>{value}</span>
    </div>
  );
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      {passed ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function IsolationBadge({ label, color }: { label: string; color: string }) {
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${color}`}>
      {label}
    </Badge>
  );
}

export function DiagnosticsPanel({ open, onOpenChange }: DiagnosticsPanelProps) {
  const { persistentState, bridgeStatus, diagnosticsLog, lastError, lastEventTs, messages } = usePingStore();
  const connectionMode = useSettingsStore((s) => s.connectionMode);
  const isLocked = useSettingsStore((s) => s.isLocked);
  const ingestConnected = useIngestStore((s) => s.connected);
  const rememberSecret = useIngestStore((s) => s.rememberSecret);
  const secureStreamConnected = useIngestStore((s) => s.secureStreamConnected);
  const channelKey = useIngestStore((s) => s.channelKey);
  const [showDataHandling, setShowDataHandling] = useState(false);

  const unknownEvents = diagnosticsLog.filter((e) => e.type.startsWith('unknown:'));
  const hasAssistantMessage = messages.some((m) => m.role === 'assistant');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-80">
        <SheetHeader>
          <SheetTitle className="font-semibold">Diagnostics</SheetTitle>
        </SheetHeader>

        {isLocked ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center py-8">
            <p className="text-xs text-muted-foreground">Session is locked</p>
          </div>
        ) : (
          <div className="mt-6 space-y-0 divide-y divide-border/30">
            <Row label="Mode" value={connectionMode === 'demo' ? 'Demo' : 'Bridge'} />
            <Row
              label="Bridge"
              value={bridgeStatus.connected ? 'Connected' : 'Disconnected'}
              color={bridgeStatus.connected ? 'text-green-400 font-medium' : 'text-muted-foreground'}
            />
            {bridgeStatus.protocolVersion && (
              <Row label="Protocol" value={bridgeStatus.protocolVersion} />
            )}
            {bridgeStatus.agentId && <Row label="Agent ID" value={bridgeStatus.agentId} />}
            {bridgeStatus.agentName && <Row label="Agent" value={bridgeStatus.agentName} />}
            <Row label="State" value={persistentState} />
            <Row
              label="Last Event"
              value={lastEventTs ? new Date(lastEventTs).toLocaleTimeString() : '—'}
            />

            {lastError && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs py-2 text-red-400 hover:text-red-300">
                  <span>Last Error</span>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-xs text-red-400/80 pb-2 font-mono break-all">{lastError}</p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {unknownEvents.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs py-2 text-muted-foreground hover:text-foreground">
                  <span>Unknown Events ({unknownEvents.length})</span>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 pb-2 max-h-40 overflow-y-auto">
                    {unknownEvents.map((e, i) => (
                      <div key={i} className="text-[10px] font-mono text-muted-foreground/60">
                        {new Date(e.ts).toLocaleTimeString()} — {e.type}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {connectionMode === 'bridge' && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs py-2 text-muted-foreground hover:text-foreground">
                  <span>Bridge Test Checklist</span>
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-0.5 pb-2">
                    <CheckItem label="Status: Idle" passed={persistentState === 'idle'} />
                    <CheckItem label="Protocol version received" passed={!!bridgeStatus.protocolVersion} />
                    <CheckItem label="Agent name received" passed={!!bridgeStatus.agentName} />
                    <CheckItem label="Message round-trip" passed={hasAssistantMessage} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Row
              label="Secure Stream"
              value={secureStreamConnected ? 'Connected' : 'Disconnected'}
              color={secureStreamConnected ? 'text-green-400 font-medium' : 'text-muted-foreground'}
            />
            <Row label="Channel Key" value={channelKey.slice(0, 4) + '••••' + channelKey.slice(-4)} />

            {/* Isolation Status */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-xs py-2 text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Isolation Status
                </span>
                <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pb-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">OpenClaw</span>
                    <IsolationBadge label="Local-only" color="bg-green-500/20 text-green-400 border-green-500/30" />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Webhook ingest</span>
                    <IsolationBadge
                      label={secureStreamConnected ? 'Inbound-only (Secure)' : ingestConnected ? 'Inbound-only' : 'Not connected'}
                      color={secureStreamConnected || ingestConnected ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-muted/30 text-muted-foreground border-border/30'}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Cross-forwarding</span>
                    <IsolationBadge label="Disabled" color="bg-muted/30 text-muted-foreground border-border/30" />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Token storage</span>
                    <span className="text-[10px] text-muted-foreground">
                      OpenClaw: No · Webhook: {rememberSecret ? 'Stored locally' : 'Memory-only'}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDataHandling(true)}
                    className="text-[10px] text-muted-foreground/60 hover:text-foreground h-6 px-2"
                  >
                    View data handling →
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </SheetContent>

      {/* Data handling modal */}
      <Dialog open={showDataHandling} onOpenChange={setShowDataHandling}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Data Handling</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4">
            <li>OpenClaw data stays on your machine — never sent externally.</li>
            <li>Webhook events come into Ping — they are not forwarded elsewhere.</li>
            <li>Ping does not send OpenClaw session data to the webhook pipeline or any external service.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
