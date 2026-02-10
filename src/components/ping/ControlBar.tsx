import { type ComponentType } from 'react';
import {
  Settings, Terminal, Plug2, Volume2, VolumeX,
  Bell, BellOff, Play, Pause, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlBarProps {
  onConnect: () => void;
  onSettings: () => void;
  onDiagnostics: () => void;
  onAbout: () => void;
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

export function ControlBar({ onConnect, onSettings, onDiagnostics, onAbout }: ControlBarProps) {
  const { connectionMode, setConnectionMode, muted, setMuted, dnd, setDnd } = useSettingsStore();
  const isDemoMode = connectionMode === 'demo';

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-0.5">
      <ControlButton
        icon={isDemoMode ? Pause : Play}
        label={isDemoMode ? 'Demo Active' : 'Start Demo'}
        onClick={() => setConnectionMode(isDemoMode ? 'bridge' : 'demo')}
        active={isDemoMode}
      />
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
      <ControlButton icon={Settings} label="Settings" onClick={onSettings} />
      <ControlButton icon={Terminal} label="Diagnostics" onClick={onDiagnostics} />
      <ControlButton icon={Info} label="About" onClick={onAbout} />
    </div>
  );
}
