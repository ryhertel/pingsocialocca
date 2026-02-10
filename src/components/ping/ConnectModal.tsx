import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePingStore } from '@/stores/usePingStore';
import { connectBridge, disconnectBridge } from '@/lib/bridge';
import { startDemo, stopDemo } from '@/lib/demoEngine';
import { Plug2, Play } from 'lucide-react';

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const { connectionMode, setConnectionMode, bridgeUrl, setBridgeUrl } = useSettingsStore();
  const bridgeStatus = usePingStore((s) => s.bridgeStatus);

  const handleConnect = () => {
    if (connectionMode === 'demo') {
      stopDemo();
      startDemo();
    } else {
      connectBridge(bridgeUrl);
    }
    onOpenChange(false);
  };

  const handleModeSwitch = (mode: 'demo' | 'bridge') => {
    if (mode === 'demo') {
      disconnectBridge();
    } else {
      stopDemo();
    }
    setConnectionMode(mode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-semibold">Connect</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={connectionMode === 'demo' ? 'default' : 'outline'}
              onClick={() => handleModeSwitch('demo')}
              className="flex-1 gap-2"
            >
              <Play className="h-4 w-4" /> Demo
            </Button>
            <Button
              variant={connectionMode === 'bridge' ? 'default' : 'outline'}
              onClick={() => handleModeSwitch('bridge')}
              className="flex-1 gap-2"
            >
              <Plug2 className="h-4 w-4" /> Bridge
            </Button>
          </div>

          {connectionMode === 'bridge' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">WebSocket URL</Label>
                <Input
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  placeholder="ws://127.0.0.1:3939/ping"
                  className="bg-muted/40 border-border/50 font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Bridge must bind to 127.0.0.1 only. UI never stores tokens.
                <br />
                Tip: If your server doesn't support URL paths, use{' '}
                <span className="font-mono text-muted-foreground">ws://127.0.0.1:3939</span>
              </p>

              {bridgeStatus.connected && (
                <div className="text-xs space-y-1 p-2 rounded-lg bg-muted/30">
                  <p className="text-green-400">● Connected</p>
                  {bridgeStatus.protocolVersion && (
                    <p className="text-muted-foreground">
                      Protocol: {bridgeStatus.protocolVersion}
                    </p>
                  )}
                  {bridgeStatus.agentName && (
                    <p className="text-muted-foreground">
                      Agent: {bridgeStatus.agentName}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleConnect} className="w-full">
            {connectionMode === 'demo' ? 'Start Demo' : 'Connect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
