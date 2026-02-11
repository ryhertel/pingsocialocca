/**
 * Content redaction utility.
 * Used server-side in the edge function (primary) and client-side for display.
 * Strips URLs, token-like strings, code blocks, and attachment references.
 */

const URL_REGEX = /https?:\/\/[^\s)>\]"']+/gi;
const TOKEN_REGEX = /[A-Za-z0-9+/=_-]{20,}/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const ATTACHMENT_REGEX = /\[attachment[^\]]*\]/gi;

const HARD_CAP = 120;

export function redact(input: string): string {
  let result = input;

  // Strip code blocks first (they may contain URLs/tokens)
  result = result.replace(CODE_BLOCK_REGEX, '[code]');

  // Strip URLs
  result = result.replace(URL_REGEX, '[link]');

  // Strip token-like strings (hex/base64 patterns >20 chars)
  result = result.replace(TOKEN_REGEX, (match) => {
    // Avoid redacting normal words that happen to be long
    if (/^[a-zA-Z]+$/.test(match) && match.length < 30) return match;
    return '[redacted]';
  });

  // Strip attachment references
  result = result.replace(ATTACHMENT_REGEX, '[attachment]');

  // Hard cap
  if (result.length > HARD_CAP) {
    result = result.slice(0, HARD_CAP - 1) + '…';
  }

  return result.trim();
}
