/**
 * Reaction Router — Pure function mapping NormalizedEvent → ReactionOutput.
 * All routing rules live in this single file.
 *
 * Three rules govern routing, in order:
 *   1. Severity is the intensity channel. 3 forces the urgent reaction; 0 is ambient
 *      (no overlay, no icon, quiet sound). pulseLevel always mirrors severity.
 *   2. Negative events never celebrate. An error or incident skips every celebratory
 *      branch, so "Payment failed" cannot produce a coin shower.
 *   3. Keywords match on word boundaries, so "1004" is not the milestone "100" and
 *      "Admin" does not contain the chat keyword "dm". Symbol and emoji needles
 *      still match as plain substrings.
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

// ── Matching ──

const WORD_CHAR = /[A-Za-z0-9_]/;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * Compile a needle to a regex, anchoring with \b only on the sides that begin or
 * end with a word character. Word-like needles get boundaries; symbol and emoji
 * needles stay plain substrings.
 */
function compileNeedle(needle: string): RegExp {
  const escaped = needle.replace(REGEX_SPECIALS, '\\$&');
  const left = WORD_CHAR.test(needle[0]) ? '\\b' : '';
  const right = WORD_CHAR.test(needle[needle.length - 1]) ? '\\b' : '';
  return new RegExp(left + escaped + right, 'i');
}

function compileAll(needles: string[]): RegExp[] {
  return needles.map(compileNeedle);
}

const MONEY = compileAll(MONEY_WORDS);
const SUBSCRIBER = compileAll(SUBSCRIBER_WORDS);
const MESSAGE = compileAll(MESSAGE_WORDS);
const DEPLOY = compileAll(DEPLOY_WORDS);
const ERRORS = compileAll(ERROR_WORDS);
const MILESTONE = compileAll(MILESTONE_WORDS);
const LOVE = compileAll(LOVE_WORDS);
const URGENT = compileAll(URGENT_WORDS);
const PARTY = compileAll(PARTY_WORDS);

function matches(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(haystack));
}

function collectText(event: NormalizedEvent): string {
  const parts = [event.title, event.body ?? ''];
  if (event.tags) parts.push(...event.tags);
  return parts.join(' ');
}

// ── Reactions ──

const URGENT_REACTION: ReactionOutput = { eyeState: 'error', soundFn: 'playSiren', overlayType: 'shockwave', notificationIcon: 'alert' };
const ERROR_REACTION: ReactionOutput = { eyeState: 'error', soundFn: 'playError', overlayType: 'pulseWave' };

const BASE_MAP: Record<string, ReactionOutput> = {
  thinking: { eyeState: 'thinking', soundFn: 'playThinking' },
  success: { eyeState: 'idle', emotionType: 'proud', soundFn: 'playConfirm' },
  error: { eyeState: 'error', soundFn: 'playError' },
  message: { eyeState: 'idle', emotionType: 'surprise', soundFn: 'playReceive' },
  warning: { eyeState: 'idle', emotionType: 'concern', soundFn: 'playNotify' },
  incident: { eyeState: 'error', soundFn: 'playError', overlayType: 'pulseWave' },
  deploy: { eyeState: 'idle', emotionType: 'proud', soundFn: 'playExcited', overlayType: 'fireworks' },
};

/** Event types that must never produce a celebratory reaction. */
const NEGATIVE_TYPES = new Set(['error', 'incident']);

/** The quiet voice used for ambient (severity 0) events. */
const AMBIENT_SOUND = 'playIdleChirp';

function clampSeverity(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(3, Math.round(value)));
}

/**
 * Apply severity to a base reaction: pulseLevel always mirrors it, and severity 0
 * strips the attention-grabbing parts so a chatty source stays bearable.
 */
function withSeverity(reaction: ReactionOutput, severity: number): ReactionOutput {
  if (severity === 0) {
    const { overlayType: _overlayType, notificationIcon: _notificationIcon, ...rest } = reaction;
    return { ...rest, soundFn: AMBIENT_SOUND, pulseLevel: 0 };
  }
  return { ...reaction, pulseLevel: severity };
}

// ── Public API ──

export function routeEvent(event: NormalizedEvent): ReactionOutput {
  const text = collectText(event);
  const severity = clampSeverity(event.severity);
  const isNegative = NEGATIVE_TYPES.has(event.eventType);

  // Severity 3 means "wake me up" — it outranks every keyword.
  if (severity >= 3) return withSeverity(URGENT_REACTION, severity);

  // Bad news first, so nothing downstream can celebrate a failure.
  if (matches(text, URGENT)) return withSeverity(URGENT_REACTION, severity);
  if (matches(text, ERRORS)) return withSeverity(ERROR_REACTION, severity);

  // Everything below is celebratory or neutral, so a negative event skips it all
  // and falls through to its base reaction.
  if (!isNegative) {
    if (matches(text, MONEY)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'cheer', soundFn: 'playKaChing', overlayType: 'coinRain', notificationIcon: 'dollar' }, severity);
    }
    if (matches(text, SUBSCRIBER)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'proud', soundFn: 'playLevelUp', overlayType: 'confettiBurst', notificationIcon: 'heart' }, severity);
    }
    if (matches(text, DEPLOY)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'proud', soundFn: 'playExcited', overlayType: 'fireworks', notificationIcon: 'rocket' }, severity);
    }
    if (matches(text, MILESTONE)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'proud', soundFn: 'playFanfare', overlayType: 'starBurst', notificationIcon: 'star' }, severity);
    }
    if (matches(text, LOVE)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'happy', soundFn: 'playHeartbeat', overlayType: 'heartFloat', notificationIcon: 'heart' }, severity);
    }
    if (matches(text, PARTY)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'cheer', soundFn: 'playPartyHorn', overlayType: 'balloonRise', notificationIcon: 'party' }, severity);
    }
    if (matches(text, MESSAGE)) {
      return withSeverity({ eyeState: 'idle', emotionType: 'surprise', soundFn: 'playReceive', overlayType: 'sparkleTrail', notificationIcon: 'chat' }, severity);
    }
  }

  return withSeverity(BASE_MAP[event.eventType] ?? BASE_MAP.message, severity);
}
