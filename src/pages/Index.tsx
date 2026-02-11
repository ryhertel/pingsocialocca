import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { StatusChip } from '@/components/ping/StatusChip';
import { ChatStack } from '@/components/ping/ChatStack';
import { Composer } from '@/components/ping/Composer';
import { ControlBar, MobileMenu } from '@/components/ping/ControlBar';
import { ConnectModal } from '@/components/ping/ConnectModal';
import { SettingsPanel } from '@/components/ping/SettingsPanel';
import { DiagnosticsPanel } from '@/components/ping/DiagnosticsPanel';
import { WelcomeDialog } from '@/components/ping/WelcomeDialog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePingStore } from '@/stores/usePingStore';
import { startScriptedDemo, stopScriptedDemo } from '@/lib/demoScriptEngine';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLandscape } from '@/hooks/use-landscape';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import pingLogo from '@/assets/ping-logo-white.png';

const Index = () => {
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLandscapeChat, setShowLandscapeChat] = useState(false);

  const isMobile = useIsMobile();
  const isLandscape = useLandscape();
  const messages = usePingStore((s) => s.messages);

  useEffect(() => {
    if (!localStorage.getItem('ping:welcomeSeen')) setShowAbout(true);
  }, []);

  const connectionMode = useSettingsStore((s) => s.connectionMode);
  const privacyLock = useSettingsStore((s) => s.privacyLock);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lock = useSettingsStore((s) => s.lock);
  const isDemoMode = connectionMode === 'demo';

  useEffect(() => {
    if (connectionMode === 'demo') {
      startScriptedDemo();
    }
    return () => stopScriptedDemo();
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

  const controlProps = {
    onConnect: () => setShowConnect(true),
    onSettings: () => setShowSettings(true),
    onDiagnostics: () => setShowDiagnostics(true),
    onAbout: () => setShowAbout(true),
  };

  const landscapeHideChat = isMobile && isLandscape;

  return (
    <div className="h-[100svh] flex flex-col overflow-hidden bg-background select-none">
      {/* Header */}
      <header
        className="flex-none flex items-center justify-between px-4 py-2 z-10"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <img
            src={pingLogo}
            alt="Ping"
            className="h-8 cursor-pointer select-none opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => setShowAbout(true)}
          />
          <StatusChip />
          {isDemoMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 border-primary/30 text-muted-foreground cursor-help hidden sm:inline-flex"
                >
                  Demo Mode (scripted)
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                This demo is scripted to show the experience — not a real AI.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div>
          {isMobile ? (
            <MobileMenu {...controlProps} />
          ) : (
            <ControlBar {...controlProps} />
          )}
        </div>
      </header>

      {/* Main — face + chat overlay */}
      <main className="flex-1 min-h-0 relative">
        <FaceCanvas />
        {!landscapeHideChat && <ChatStack />}

        {/* Landscape chat toggle button */}
        {landscapeHideChat && messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLandscapeChat(true)}
            className="absolute bottom-2 right-2 z-10 h-9 w-9 rounded-full bg-muted/60 backdrop-blur-sm text-foreground hover:bg-muted/80"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </main>

      {/* Footer — composer */}
      <footer
        className="flex-none z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Composer />
      </footer>

      {/* Landscape chat drawer */}
      <Drawer open={showLandscapeChat} onOpenChange={setShowLandscapeChat}>
        <DrawerContent className="max-h-[50vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Chat</DrawerTitle>
            <DrawerDescription>Message history</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[40vh]">
            <ChatStack />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Modals */}
      <ConnectModal open={showConnect} onOpenChange={setShowConnect} />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <DiagnosticsPanel open={showDiagnostics} onOpenChange={setShowDiagnostics} />
      <WelcomeDialog open={showAbout} onOpenChange={setShowAbout} />
    </div>
  );
};

export default Index;
