/**
 * Reaction Router — Pure function mapping NormalizedEvent → ReactionOutput.
 * All routing rules live in this single file.
 * Keyword matches override base eventType mapping.
 */

import type { NormalizedEvent, ReactionOutput } from './types';

// ── Keyword sets ──

const MONEY_WORDS = ['paid', 'payment', 'purchase', 'sale', 'invoice', 'subscription', 'charge', '$', 'usd', 'eur', 'money'];
const DEPLOY_WORDS = ['deploy', 'shipped', 'released', 'build succeeded', 'pipeline green'];
const ERROR_WORDS = ['failed', 'exception', 'panic', 'downtime', 'incident', 'crash', '500'];

function textContains(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((w) => lower.includes(w));
}

function collectText(event: NormalizedEvent): string {
  const parts = [event.title, event.body ?? ''];
  if (event.tags) parts.push(...event.tags);
  return parts.join(' ');
}

// ── Base mapping by eventType ──

const BASE_MAP: Record<string, ReactionOutput> = {
  thinking: { eyeState: 'thinking', soundFn: 'playThinking' },
  success: { eyeState: 'idle', emotionType: 'proud', soundFn: 'playConfirm' },
  error: { eyeState: 'error', soundFn: 'playError' },
  message: { eyeState: 'idle', emotionType: 'surprise', soundFn: 'playReceive' },
  warning: { eyeState: 'idle', emotionType: 'concern', soundFn: 'playNotify' },
  incident: { eyeState: 'error', soundFn: 'playError', overlayType: 'pulseWave', pulseLevel: 2 },
  deploy: { eyeState: 'idle', emotionType: 'proud', soundFn: 'playExcited', overlayType: 'fireworks' },
};

// ── Public API ──

export function routeEvent(event: NormalizedEvent): ReactionOutput {
  const text = collectText(event);

  // Keyword routing (overrides base mapping)
  if (textContains(text, MONEY_WORDS)) {
    return { eyeState: 'idle', emotionType: 'cheer', soundFn: 'playExcited', overlayType: 'sparkleTrail' };
  }
  if (textContains(text, ERROR_WORDS)) {
    return { eyeState: 'error', soundFn: 'playError', overlayType: 'pulseWave' };
  }
  if (textContains(text, DEPLOY_WORDS)) {
    return { eyeState: 'idle', emotionType: 'proud', soundFn: 'playExcited', overlayType: 'fireworks' };
  }

  // Fall back to base eventType mapping
  return BASE_MAP[event.eventType] ?? BASE_MAP.message;
}
