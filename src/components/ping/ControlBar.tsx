import { type ComponentType } from 'react';
import {
  Settings, Terminal, Plug2, Volume2, VolumeX,
  Bell, BellOff, Play, Pause, Info, Menu, RotateCcw, Rocket, Webhook, Rss, LayoutGrid, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startScriptedDemo } from '@/lib/demoScriptEngine';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useState } from 'react';

interface ControlBarProps {
  onConnect: () => void;
  onOpenClaw: () => void;
  onSettings: () => void;
  onDiagnostics: () => void;
  onAbout: () => void;
  onWebhooks?: () => void;
  onEventFeed?: () => void;
  onConnectors?: () => void;
  onDocs?: () => void;
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={`h-8 w-8 text-muted-foreground hover:text-foreground transition-colors ${active ? 'text-primary' : ''}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ControlBar({ onConnect, onOpenClaw, onSettings, onDiagnostics, onAbout, onWebhooks, onEventFeed, onConnectors, onDocs }: ControlBarProps) {
  const { connectionMode, setConnectionMode, muted, setMuted, dnd, setDnd } = useSettingsStore();
  const isDemoMode = connectionMode === 'demo';

  return (
    <div className="flex items-center gap-0.5">
      <ControlButton
        icon={isDemoMode ? Pause : Play}
        label={isDemoMode ? 'Demo Active' : 'Start Demo'}
        onClick={() => setConnectionMode(isDemoMode ? 'bridge' : 'demo')}
        active={isDemoMode}
      />
      {isDemoMode && (
        <ControlButton
          icon={RotateCcw}
          label="Restart Demo"
          onClick={() => startScriptedDemo()}
        />
      )}
      <ControlButton
        icon={muted ? VolumeX : Volume2}
        label={muted ? 'Unmute' : 'Mute'}
        onClick={() => setMuted(!muted)}
        active={muted}
      />
      <ControlButton
        icon={dnd ? BellOff : Bell}
        label={dnd ? 'DND On' : 'DND Off'}
        onClick={() => setDnd(!dnd)}
        active={dnd}
      />
      <div className="w-px h-5 bg-border/50 mx-1" />
      <ControlButton icon={Plug2} label="Connect" onClick={onConnect} />
      <ControlButton icon={Webhook} label="Webhooks" onClick={() => onWebhooks?.()} />
      <ControlButton icon={Rss} label="Event Feed" onClick={() => onEventFeed?.()} />
      <ControlButton icon={LayoutGrid} label="Connectors" onClick={() => onConnectors?.()} />
      <ControlButton icon={BookOpen} label="Docs" onClick={() => onDocs?.()} />
      <ControlButton icon={Rocket} label="OpenClaw Setup" onClick={onOpenClaw} />
      <ControlButton icon={Settings} label="Settings" onClick={onSettings} />
      <ControlButton icon={Terminal} label="Diagnostics" onClick={onDiagnostics} />
      <ControlButton icon={Info} label="About" onClick={onAbout} />
    </div>
  );
}

function MobileMenuItem({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg transition-colors
        ${active ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function MobileMenu({ onConnect, onOpenClaw, onSettings, onDiagnostics, onAbout, onWebhooks, onEventFeed, onConnectors, onDocs }: ControlBarProps) {
  const [open, setOpen] = useState(false);
  const { connectionMode, setConnectionMode, muted, setMuted, dnd, setDnd } = useSettingsStore();
  const isDemoMode = connectionMode === 'demo';

  const act = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Controls and settings</SheetDescription>
          </SheetHeader>
          <div className="space-y-1 mt-2">
            <MobileMenuItem
              icon={isDemoMode ? Pause : Play}
              label={isDemoMode ? 'Demo Active' : 'Start Demo'}
              onClick={() => act(() => setConnectionMode(isDemoMode ? 'bridge' : 'demo'))}
              active={isDemoMode}
            />
            {isDemoMode && (
              <MobileMenuItem
                icon={RotateCcw}
                label="Restart Demo"
                onClick={() => act(() => startScriptedDemo())}
              />
            )}
            <MobileMenuItem
              icon={muted ? VolumeX : Volume2}
              label={muted ? 'Unmute Sound' : 'Mute Sound'}
              onClick={() => act(() => setMuted(!muted))}
              active={muted}
            />
            <MobileMenuItem
              icon={dnd ? BellOff : Bell}
              label={dnd ? 'Disable Do Not Disturb' : 'Do Not Disturb'}
              onClick={() => act(() => setDnd(!dnd))}
              active={dnd}
            />
            <div className="h-px bg-border/50 my-2" />
            <MobileMenuItem icon={Plug2} label="Connect" onClick={() => act(onConnect)} />
            <MobileMenuItem icon={Webhook} label="Webhooks" onClick={() => act(() => onWebhooks?.())} />
            <MobileMenuItem icon={Rss} label="Event Feed" onClick={() => act(() => onEventFeed?.())} />
            <MobileMenuItem icon={LayoutGrid} label="Connectors" onClick={() => act(() => onConnectors?.())} />
            <MobileMenuItem icon={BookOpen} label="Docs" onClick={() => act(() => onDocs?.())} />
            <MobileMenuItem icon={Rocket} label="OpenClaw Setup" onClick={() => act(onOpenClaw)} />
            <MobileMenuItem icon={Settings} label="Settings" onClick={() => act(onSettings)} />
            <MobileMenuItem icon={Terminal} label="Diagnostics" onClick={() => act(onDiagnostics)} />
            <MobileMenuItem icon={Info} label="About" onClick={() => act(onAbout)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
