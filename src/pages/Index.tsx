import { useState, useEffect, useRef, useCallback } from 'react';
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
  const privacyLock = useSettingsStore((s) => s.privacyLock);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lock = useSettingsStore((s) => s.lock);

  useEffect(() => {
    if (connectionMode === 'demo') {
      startDemo();
    }
    return () => stopDemo();
  }, [connectionMode]);

  // Privacy Lock: inactivity timer with throttled mousemove
  const inactivityTimer = useRef<number | null>(null);
  const lastResetTs = useRef(Date.now());

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(() => {
      lock();
    }, autoLockMinutes * 60 * 1000);
  }, [autoLockMinutes, lock]);

  useEffect(() => {
    if (!privacyLock) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }

    lastResetTs.current = Date.now();
    resetInactivityTimer();

    const onImmediate = () => {
      lastResetTs.current = Date.now();
      resetInactivityTimer();
    };

    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastResetTs.current < 3000) return;
      lastResetTs.current = now;
      resetInactivityTimer();
    };

    window.addEventListener('keydown', onImmediate);
    window.addEventListener('touchstart', onImmediate);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.removeEventListener('keydown', onImmediate);
      window.removeEventListener('touchstart', onImmediate);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [privacyLock, resetInactivityTimer]);

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
