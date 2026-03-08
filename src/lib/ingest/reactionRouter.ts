/**
 * Reaction Router — Pure function mapping NormalizedEvent → ReactionOutput.
 * All routing rules live in this single file.
 * Keyword matches override base eventType mapping.
 */

import type { NormalizedEvent, ReactionOutput } from './types';

// ── Keyword sets ──

const MONEY_WORDS = ['paid', 'payment', 'purchase', 'sale', 'invoice', 'subscription', 'charge', '$', 'usd', 'eur', 'money', 'revenue'];
const SUBSCRIBER_WORDS = ['subscriber', 'signup', 'sign up', 'registered', 'new user', 'joined', 'follower', 'follow', 'member'];
const MESSAGE_WORDS = ['message', 'comment', 'reply', 'mention', 'dm', 'chat', 'inbox'];
const DEPLOY_WORDS = ['deploy', 'shipped', 'released', 'build succeeded', 'pipeline green'];
const ERROR_WORDS = ['failed', 'exception', 'panic', 'downtime', 'incident', 'crash', '500'];
const MILESTONE_WORDS = ['milestone', '100', '1000', '10k', 'goal', 'achieved', 'record', '🎯', 'achievement'];
const LOVE_WORDS = ['thank', 'thanks', 'love', 'appreciate', '❤️', '🙏', 'awesome', 'great job', 'well done'];
const URGENT_WORDS = ['urgent', 'critical', 'alert', 'emergency', 'pager', 'on-call', 'p0', 'sev1', 'sev0'];
const PARTY_WORDS = ['party', 'celebrate', 'congrats', 'birthday', 'launch', 'anniversary', '🎉', '🥳', 'woohoo'];

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

  // Keyword routing (overrides base mapping) — priority order
  if (textContains(text, MONEY_WORDS)) {
    return { eyeState: 'idle', emotionType: 'cheer', soundFn: 'playKaChing', overlayType: 'coinRain', notificationIcon: 'dollar' };
  }
  if (textContains(text, SUBSCRIBER_WORDS)) {
    return { eyeState: 'idle', emotionType: 'proud', soundFn: 'playLevelUp', overlayType: 'confettiBurst', notificationIcon: 'heart' };
  }
  if (textContains(text, ERROR_WORDS)) {
    return { eyeState: 'error', soundFn: 'playError', overlayType: 'pulseWave' };
  }
  if (textContains(text, DEPLOY_WORDS)) {
    return { eyeState: 'idle', emotionType: 'proud', soundFn: 'playExcited', overlayType: 'fireworks', notificationIcon: 'rocket' };
  }
  if (textContains(text, MESSAGE_WORDS)) {
    return { eyeState: 'idle', emotionType: 'surprise', soundFn: 'playReceive', overlayType: 'sparkleTrail', notificationIcon: 'chat' };
  }
  if (textContains(text, MILESTONE_WORDS)) {
    return { eyeState: 'idle', emotionType: 'proud', soundFn: 'playFanfare', overlayType: 'starBurst', notificationIcon: 'star' };
  }
  if (textContains(text, LOVE_WORDS)) {
    return { eyeState: 'idle', emotionType: 'happy', soundFn: 'playHeartbeat', overlayType: 'heartFloat', notificationIcon: 'heart' };
  }
  if (textContains(text, URGENT_WORDS)) {
    return { eyeState: 'error', soundFn: 'playSiren', overlayType: 'shockwave', notificationIcon: 'alert' };
  }
  if (textContains(text, PARTY_WORDS)) {
    return { eyeState: 'idle', emotionType: 'cheer', soundFn: 'playPartyHorn', overlayType: 'balloonRise', notificationIcon: 'party' };
  }

  // Fall back to base eventType mapping
  return BASE_MAP[event.eventType] ?? BASE_MAP.message;
}
