/**
 * Reaction Executor — Dispatches ReactionOutput side effects into UI state.
 *
 * ISOLATION RULE: This module is write-only into UI state.
 * It may import: audio.ts (sounds + triggerEmotion), usePingStore (setPersistentState, triggerReaction)
 * It may NOT import: bridge.ts, OpenClaw session data, message history
 * ReactionExecutor must not access OpenClaw data under any circumstance.
 */

import type { ReactionOutput } from './types';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  playConfirm, playError, playReceive, playNotify,
  playThinking, playExcited, triggerEmotion,
} from '@/lib/audio';

let lastSoundTime = 0;
const SOUND_COOLDOWN = 300;

const SOUND_FN_MAP: Record<string, (vol: number, muted: boolean, dnd: boolean) => void> = {
  playConfirm,
  playError,
  playReceive,
  playNotify,
  playThinking,
  playExcited,
};

export function executeReaction(reaction: ReactionOutput): void {
  const pingStore = usePingStore.getState();
  const settings = useSettingsStore.getState();

  // Eye state
  pingStore.setPersistentState(reaction.eyeState);

  // Emotion
  if (reaction.emotionType) {
    triggerEmotion(reaction.emotionType, 2000);
  }

  // Sound (with cooldown)
  const now = Date.now();
  if (now - lastSoundTime >= SOUND_COOLDOWN) {
    const soundFn = SOUND_FN_MAP[reaction.soundFn];
    if (soundFn) {
      soundFn(settings.volume, settings.muted, settings.dnd);
      lastSoundTime = now;
    }
  }

  // Overlay (skip if reduced motion)
  if (reaction.overlayType && settings.animationIntensity !== 'low') {
    window.dispatchEvent(new CustomEvent('ping:triggerSpectacle', { detail: reaction.overlayType }));
  }

  // Trigger transient reaction for UI feedback
  if (reaction.eyeState === 'error') {
    pingStore.triggerReaction('notify');
  } else {
    pingStore.triggerReaction('success');
  }
}
