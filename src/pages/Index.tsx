import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullIndicator } from '@/components/ping/PullIndicator';
import { FaceCanvas } from '@/components/ping/FaceCanvas';
import { StatusChip } from '@/components/ping/StatusChip';
import { ChatStack } from '@/components/ping/ChatStack';
import { DockedChat } from '@/components/ping/DockedChat';
import { Composer } from '@/components/ping/Composer';
import { ControlBar, MobileMenu } from '@/components/ping/ControlBar';
import { ConnectModal } from '@/components/ping/ConnectModal';
import { OpenClawSetupModal } from '@/components/ping/OpenClawSetupModal';
import { SettingsPanel } from '@/components/ping/SettingsPanel';
import { DiagnosticsPanel } from '@/components/ping/DiagnosticsPanel';
import { WelcomeDialog } from '@/components/ping/WelcomeDialog';
import { OnboardingTour } from '@/components/ping/OnboardingTour';
import { WebhookPanel } from '@/components/ping/WebhookPanel';
import { EventFeed } from '@/components/ping/EventFeed';
import { KeyboardShortcutsHelp } from '@/components/ping/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePingStore } from '@/stores/usePingStore';
import { useIngestStore } from '@/stores/useIngestStore';
import { startSecureStream, stopSecureStream, fetchRecentEventsSecure } from '@/lib/ingest/realtime';
import { issueReadToken } from '@/lib/ingest/privateReadClient';
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
  const navigate = useNavigate();
  useAnalytics();
  const [showConnect, setShowConnect] = useState(false);
  const [showOpenClaw, setShowOpenClaw] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLandscapeChat, setShowLandscapeChat] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [showEventFeed, setShowEventFeed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useKeyboardShortcuts({
    onSettings: () => setShowSettings(true),
    onShortcutsHelp: () => setShowShortcuts(true),
  });

  const isMobile = useIsMobile();
  const isLandscape = useLandscape();
  const messages = usePingStore((s) => s.messages);
  const channelKey = useIngestStore((s) => s.channelKey);
  const ingestSecret = useIngestStore((s) => s.ingestSecret);
  const setReadToken = useIngestStore((s) => s.setReadToken);
  const chatLayout = useSettingsStore((s) => s.chatLayout);

  const isDocked = chatLayout === 'docked' && !isMobile;

  // Secure stream lifecycle
  useEffect(() => {
    if (!channelKey || !ingestSecret) return;
    let cancelled = false;
    const boot = async () => {
      const token = await issueReadToken(channelKey, ingestSecret);
      if (cancelled || !token) return;
      setReadToken(token);
      await fetchRecentEventsSecure(channelKey, token);
      if (cancelled) return;
      startSecureStream(channelKey, token);
    };
    boot();
    return () => { cancelled = true; stopSecureStream(); setReadToken(null); };
  }, [channelKey, ingestSecret, setReadToken]);

  useEffect(() => {
    if (!localStorage.getItem('ping:welcomeSeen')) setShowAbout(true);
  }, []);

  useEffect(() => {
    const handler = () => setShowOpenClaw(true);
    window.addEventListener('ping:openClawSetup', handler);
    return () => window.removeEventListener('ping:openClawSetup', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowWebhookPanel(true);
    window.addEventListener('ping:openWebhookPanel', handler);
    return () => window.removeEventListener('ping:openWebhookPanel', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowTour(true);
    window.addEventListener('ping:startTour', handler);
    return () => window.removeEventListener('ping:startTour', handler);
  }, []);
  const connectionMode = useSettingsStore((s) => s.connectionMode);
  const privacyLock = useSettingsStore((s) => s.privacyLock);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lock = useSettingsStore((s) => s.lock);
  const isDemoMode = connectionMode === 'demo';

  useEffect(() => {
    if (connectionMode === 'demo') startScriptedDemo();
    return () => stopScriptedDemo();
  }, [connectionMode]);

  // Privacy Lock: inactivity timer
  const inactivityTimer = useRef<number | null>(null);
  const lastResetTs = useRef(Date.now());

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(() => lock(), autoLockMinutes * 60 * 1000);
  }, [autoLockMinutes, lock]);

  useEffect(() => {
    if (!privacyLock) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }
    lastResetTs.current = Date.now();
    resetInactivityTimer();
    const onImmediate = () => { lastResetTs.current = Date.now(); resetInactivityTimer(); };
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
    onOpenClaw: () => setShowOpenClaw(true),
    onSettings: () => setShowSettings(true),
    onDiagnostics: () => setShowDiagnostics(true),
    onAbout: () => setShowAbout(true),
    onWebhooks: () => setShowWebhookPanel(true),
    onEventFeed: () => setShowEventFeed(true),
    onConnectors: () => navigate('/connectors'),
    onDocs: () => navigate('/docs'),
  };
  const { vibrate } = useHaptics();

  const handleRefresh = useCallback(async () => {
    vibrate('success');
    window.location.reload();
  }, [vibrate]);

  const { containerRef: pullRef, pulling, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  const landscapeHideChat = isMobile && isLandscape;

  return (
    <div ref={pullRef} className="h-[100svh] flex flex-col overflow-hidden bg-background select-none [&_.chat-selectable]:select-text">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium">
        Skip to content
      </a>
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
            onClick={() => navigate('/')}
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

      {/* Main — face + chat */}
      <main id="main-content" className="flex-1 min-h-0 relative flex">
        <PullIndicator pulling={pulling} pullDistance={pullDistance} refreshing={refreshing} threshold={80} />
        {/* Face area */}
        <div className={`relative ${isDocked ? 'flex-1' : 'w-full'}`} data-tour="face">
          <FaceCanvas />
          {!isDocked && !landscapeHideChat && <ChatStack />}

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
        </div>

        {/* Docked chat panel */}
        {isDocked && (
          <div className="w-80 shrink-0 border-l border-border/30 bg-card/50 backdrop-blur-md flex flex-col">
            <DockedChat className="flex-1 min-h-0" />
          </div>
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
      <ConnectModal
        open={showConnect}
        onOpenChange={setShowConnect}
        onOpenWebhooks={() => setShowWebhookPanel(true)}
      />
      <OpenClawSetupModal open={showOpenClaw} onOpenChange={setShowOpenClaw} />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <DiagnosticsPanel open={showDiagnostics} onOpenChange={setShowDiagnostics} />
      <WelcomeDialog
        open={showAbout}
        onOpenChange={(v) => {
          setShowAbout(v);
          if (!v && !localStorage.getItem('ping:tourSeen')) {
            setTimeout(() => setShowTour(true), 400);
          }
        }}
      />
      <WebhookPanel open={showWebhookPanel} onOpenChange={setShowWebhookPanel} />
      <EventFeed open={showEventFeed} onOpenChange={setShowEventFeed} />
      <KeyboardShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
      <OnboardingTour open={showTour} onComplete={() => setShowTour(false)} />
    </div>
  );
};

export default Index;
