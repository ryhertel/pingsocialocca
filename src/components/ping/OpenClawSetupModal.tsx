import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Check, ChevronDown, Terminal, Plug2, Rocket, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePingStore } from '@/stores/usePingStore';
import { connectBridge, disconnectBridge } from '@/lib/bridge';
import { stopScriptedDemo } from '@/lib/demoScriptEngine';
import { playConfirm, triggerEmotion } from '@/lib/audio';

interface OpenClawSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BRIDGE_COMMAND = 'cd /home/ryan/.openclaw/workspace/ping-openclaw-bridge && node bridge.mjs';
const DEFAULT_WS_URL = 'ws://127.0.0.1:3939/ping';

const STEPS = [
  {
    icon: Terminal,
    title: 'Open your terminal',
    description: 'Launch Ubuntu (WSL) or your preferred terminal on your computer.',
  },
  {
    icon: Rocket,
    title: 'Start the bridge',
    description: 'Run the following command to start the OpenClaw bridge server:',
    hasCommand: true,
  },
  {
    icon: Plug2,
    title: 'Connect Ping',
    description: 'Click Connect below. Keep the terminal open while using Ping.',
    hasConnect: true,
  },
];

const TROUBLESHOOTING = [
  {
    problem: '"Address already in use"',
    solution: 'Another bridge instance is running. Find and stop it, or use a different port.',
  },
  {
    problem: 'Connection refused',
    solution: 'Make sure the bridge is running and the WebSocket URL matches (default: ws://127.0.0.1:3939/ping).',
  },
  {
    problem: 'Works on desktop but not mobile',
    solution: '127.0.0.1 refers to the device itself. On mobile, use your computer\'s local IP instead.',
  },
  {
    problem: 'Bridge connects then immediately disconnects',
    solution: 'Check that your bridge supports the ping/0.1 protocol. Update OpenClaw to the latest version.',
  },
];

export function OpenClawSetupModal({ open, onOpenChange }: OpenClawSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);

  const { bridgeUrl, setBridgeUrl, setConnectionMode } = useSettingsStore();
  const bridgeStatus = usePingStore((s) => s.bridgeStatus);
  const isConnected = bridgeStatus.connected;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BRIDGE_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = BRIDGE_COMMAND;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    stopScriptedDemo();
    setConnectionMode('bridge');

    // Small delay to allow mode switch
    setTimeout(() => {
      connectBridge(bridgeUrl || DEFAULT_WS_URL);
    }, 100);

    // Watch for connection success
    const checkInterval = setInterval(() => {
      const status = usePingStore.getState().bridgeStatus;
      if (status.connected) {
        clearInterval(checkInterval);
        setConnecting(false);

        // Proud eye animation + confirm sound
        const settings = useSettingsStore.getState();
        playConfirm(settings.volume, settings.muted, settings.dnd);
        triggerEmotion('proud', 3000);
        usePingStore.getState().triggerReaction('success');
      }
    }, 300);

    // Timeout after 10s
    setTimeout(() => {
      clearInterval(checkInterval);
      setConnecting(false);
    }, 10000);
  };

  const handleDisconnect = () => {
    disconnectBridge();
    setConnectionMode('demo');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-semibold flex items-center gap-2">
            <Plug2 className="h-5 w-5 text-primary" />
            Connect OpenClaw
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Run the bridge locally — no tokens stored in the browser.
          </DialogDescription>
        </DialogHeader>

        {/* Status banner */}
        {isConnected && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">Connected</p>
              {bridgeStatus.agentName && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Agent: {bridgeStatus.agentName}
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={handleDisconnect} className="text-xs h-7">
              Disconnect
            </Button>
          </div>
        )}

        {/* 3-Step Setup */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border/50 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-muted-foreground">
                      {i + 1}
                    </Badge>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>

                  {step.hasCommand && (
                    <div className="mt-2 flex items-center gap-1">
                      <code className="flex-1 text-[11px] font-mono bg-muted/40 rounded-md px-3 py-2 text-foreground border border-border/50 break-all leading-relaxed">
                        {BRIDGE_COMMAND}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCopy}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}

                  {step.hasConnect && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={bridgeUrl}
                          onChange={(e) => setBridgeUrl(e.target.value)}
                          placeholder={DEFAULT_WS_URL}
                          className="bg-muted/40 border-border/50 font-mono text-xs h-8 flex-1"
                        />
                      </div>
                      <Button
                        onClick={handleConnect}
                        disabled={connecting || isConnected}
                        className="w-full"
                        size="sm"
                      >
                        {connecting ? 'Connecting…' : isConnected ? 'Connected ✓' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Troubleshooting */}
        <Collapsible open={troubleshootOpen} onOpenChange={setTroubleshootOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Troubleshooting</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${troubleshootOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {TROUBLESHOOTING.map((item, i) => (
              <div key={i} className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-foreground">{item.problem}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.solution}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
