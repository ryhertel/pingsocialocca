import { useState, useEffect } from 'react';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { StatusChip } from '@/components/ping/StatusChip';
import { ChatStack } from '@/components/ping/ChatStack';
import { Composer } from '@/components/ping/Composer';
import { ControlBar } from '@/components/ping/ControlBar';
import { ConnectModal } from '@/components/ping/ConnectModal';
import { SettingsPanel } from '@/components/ping/SettingsPanel';
import { DiagnosticsPanel } from '@/components/ping/DiagnosticsPanel';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { startDemo, stopDemo } from '@/lib/demoEngine';

const Index = () => {
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const connectionMode = useSettingsStore((s) => s.connectionMode);

  useEffect(() => {
    if (connectionMode === 'demo') {
      startDemo();
    }
    return () => stopDemo();
  }, [connectionMode]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background select-none">
      <FaceCanvas />
      <StatusChip />
      <ControlBar
        onConnect={() => setShowConnect(true)}
        onSettings={() => setShowSettings(true)}
        onDiagnostics={() => setShowDiagnostics(true)}
      />
      <ChatStack />
      <Composer />
      <ConnectModal open={showConnect} onOpenChange={setShowConnect} />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <DiagnosticsPanel open={showDiagnostics} onOpenChange={setShowDiagnostics} />
    </div>
  );
};

export default Index;
