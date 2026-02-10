import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

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

export function DiagnosticsPanel({ open, onOpenChange }: DiagnosticsPanelProps) {
  const { persistentState, bridgeStatus, diagnosticsLog, lastError, lastEventTs } = usePingStore();
  const connectionMode = useSettingsStore((s) => s.connectionMode);

  const unknownEvents = diagnosticsLog.filter((e) => e.type.startsWith('unknown:'));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-80">
        <SheetHeader>
          <SheetTitle className="font-semibold">Diagnostics</SheetTitle>
        </SheetHeader>

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
        </div>
      </SheetContent>
    </Sheet>
  );
}
