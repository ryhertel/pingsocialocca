import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import type { ThemePreset, AnimationIntensity } from '@/lib/types';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const settings = useSettingsStore();

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

          {/* Animation Intensity */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Animation Intensity</Label>
            <div className="flex gap-1.5">
              {(['low', 'medium', 'high'] as AnimationIntensity[]).map((level) => (
                <Button
                  key={level}
                  variant={settings.animationIntensity === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => settings.setAnimationIntensity(level)}
                  className="flex-1 text-xs capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
            {settings.animationIntensity === 'low' && (
              <p className="text-[10px] text-muted-foreground">Reduced motion</p>
            )}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
