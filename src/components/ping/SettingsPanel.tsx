import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { OnboardingTour } from '@/components/ping/OnboardingTour';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore, ENERGY_PRESETS } from '@/stores/useSettingsStore';
import { useIngestStore } from '@/stores/useIngestStore';
import { usePingStore } from '@/stores/usePingStore';
import { themePresets } from '@/lib/themes';
import type { ThemePreset, ColorMode, AutoLockMinutes, ChatLayout } from '@/lib/types';
import { MessageCircle, PanelRight, Trash2, Sun, Moon, Monitor, RotateCcw, Download, Upload, Copy, ClipboardPaste } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRef } from 'react';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEnergyLabel(level: number): string {
  if (level <= 15) return 'Minimal';
  if (level <= 40) return 'Balanced';
  if (level <= 75) return 'Expressive';
  return 'Hyper';
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const settings = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildConfig = () => {
    const settingsState = useSettingsStore.getState();
    const ingestState = useIngestStore.getState();
    return {
      _format: 'ping-config-v1',
      exportedAt: new Date().toISOString(),
      settings: {
        displayName: settingsState.displayName,
        theme: settingsState.theme,
        colorMode: settingsState.colorMode,
        energyLevel: settingsState.energyLevel,
        muted: settingsState.muted,
        volume: settingsState.volume,
        idleChirps: settingsState.idleChirps,
        dnd: settingsState.dnd,
        chatLayout: settingsState.chatLayout,
        privacyLock: settingsState.privacyLock,
        autoLockMinutes: settingsState.autoLockMinutes,
      },
      channel: {
        channelKey: ingestState.channelKey,
      },
    };
  };

  const handleExport = () => {
    const config = buildConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ping-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Config exported', description: 'Share this file with teammates to replicate your setup.' });
  };

  const handleCopyToClipboard = async () => {
    const config = buildConfig();
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast({ title: 'Copied to clipboard', description: 'Paste this config JSON to share with teammates.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not access clipboard.', variant: 'destructive' });
    }
  };

  const applyConfig = (raw: string): boolean => {
    try {
      const config = JSON.parse(raw);
      if (config._format !== 'ping-config-v1') {
        toast({ title: 'Invalid config', description: 'This doesn\'t appear to be a Ping config.', variant: 'destructive' });
        return false;
      }
      const s = config.settings;
      if (s) {
        if (s.displayName) settings.setDisplayName(s.displayName);
        if (s.theme) settings.setTheme(s.theme);
        if (s.colorMode) settings.setColorMode(s.colorMode);
        if (s.energyLevel != null) settings.setEnergyLevel(s.energyLevel);
        if (s.muted != null) settings.setMuted(s.muted);
        if (s.volume != null) settings.setVolume(s.volume);
        if (s.idleChirps != null) settings.setIdleChirps(s.idleChirps);
        if (s.dnd != null) settings.setDnd(s.dnd);
        if (s.chatLayout) settings.setChatLayout(s.chatLayout);
        if (s.privacyLock != null) settings.setPrivacyLock(s.privacyLock);
        if (s.autoLockMinutes) settings.setAutoLockMinutes(s.autoLockMinutes);
      }
      if (config.channel?.channelKey) {
        useIngestStore.getState().setChannelKey(config.channel.channelKey);
      }
      toast({ title: 'Config imported', description: 'Settings and channel setup applied.' });
      return true;
    } catch {
      toast({ title: 'Import failed', description: 'Could not parse config.', variant: 'destructive' });
      return false;
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyConfig(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ title: 'Clipboard empty', description: 'No config JSON found in clipboard.', variant: 'destructive' });
        return;
      }
      applyConfig(text);
    } catch {
      toast({ title: 'Paste failed', description: 'Could not read clipboard. Check browser permissions.', variant: 'destructive' });
    }
  };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-80">
        <SheetHeader>
          <SheetTitle className="font-semibold">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Display Name</Label>
            <Input
              value={settings.displayName}
              onChange={(e) => settings.setDisplayName(e.target.value)}
              className="bg-muted/40 border-border/50"
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Theme</Label>
            <div className="flex gap-3">
              {(Object.entries(themePresets) as [ThemePreset, (typeof themePresets)[ThemePreset]][]).map(
                ([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => settings.setTheme(key)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      settings.theme === key
                        ? 'border-foreground scale-110'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: `hsl(${preset.glowPrimary})` }}
                    title={preset.name}
                  />
                ),
              )}
            </div>
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Appearance</Label>
            <div className="flex gap-2">
              {([
                { key: 'dark' as ColorMode, icon: Moon, label: 'Dark' },
                { key: 'light' as ColorMode, icon: Sun, label: 'Light' },
                { key: 'system' as ColorMode, icon: Monitor, label: 'System' },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => settings.setColorMode(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                    settings.colorMode === key
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Layout */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Chat Style</Label>
            <div className="flex gap-2">
              {([
                { key: 'bubbles' as ChatLayout, icon: MessageCircle, label: 'Bubbles' },
                { key: 'docked' as ChatLayout, icon: PanelRight, label: 'Docked Panel' },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => settings.setChatLayout(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                    settings.chatLayout === key
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ping Energy Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Ping Energy Level</Label>
              <span className="text-[10px] text-muted-foreground font-medium">
                {getEnergyLabel(settings.energyLevel)}
              </span>
            </div>
            <Slider
              value={[settings.energyLevel]}
              onValueChange={([v]) => settings.setEnergyLevel(v)}
              min={0}
              max={100}
              step={1}
            />
            <div className="flex justify-between">
              {(Object.entries(ENERGY_PRESETS) as [string, number][]).map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => settings.setEnergyLevel(value)}
                  className={`text-[9px] capitalize px-1.5 py-0.5 rounded transition-colors ${
                    settings.energyLevel === value
                      ? 'text-primary'
                      : 'text-muted-foreground/50 hover:text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Sound</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Mute</span>
              <Switch checked={settings.muted} onCheckedChange={settings.setMuted} />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm">Volume</span>
              <Slider
                value={[settings.volume]}
                onValueChange={([v]) => settings.setVolume(v)}
                min={0}
                max={1}
                step={0.05}
                disabled={settings.muted || settings.dnd}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Idle Chirps</span>
              <Switch checked={settings.idleChirps} onCheckedChange={settings.setIdleChirps} />
            </div>
          </div>

          {/* DND */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Do Not Disturb</span>
              <p className="text-[10px] text-muted-foreground">Disables all sounds</p>
            </div>
            <Switch checked={settings.dnd} onCheckedChange={settings.setDnd} />
          </div>

          {/* Privacy */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Privacy</Label>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Privacy Lock</span>
                <p className="text-[10px] text-muted-foreground">Lock after inactivity</p>
              </div>
              <Switch checked={settings.privacyLock} onCheckedChange={settings.setPrivacyLock} />
            </div>
            {settings.privacyLock && (
              <div className="space-y-1.5">
                <span className="text-sm">Auto-lock after</span>
                <Select
                  value={String(settings.autoLockMinutes)}
                  onValueChange={(v) => settings.setAutoLockMinutes(Number(v) as AutoLockMinutes)}
                >
                  <SelectTrigger className="bg-muted/40 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border/30 space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground border-border/30"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground border-border/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground border-border/30"
                onClick={handleCopyToClipboard}
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground border-border/30"
                onClick={handlePasteFromClipboard}
              >
                <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                Paste
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground border-border/30"
              onClick={() => {
                localStorage.removeItem('ping:tourSeen');
                onOpenChange(false);
                setTimeout(() => window.dispatchEvent(new Event('ping:startTour')), 300);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Restart Tour
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                usePingStore.getState().clearMessages();
                toast({ title: 'Chat history cleared' });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Clear Chat History
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
