/**
 * Content redaction — the canonical implementation.
 *
 * Strips URLs, token-like strings, code blocks and attachment references from
 * text before it is stored. Runs server-side, after adaptation (adapters need the
 * raw strings to build a title) and inside validate(), just before insert.
 *
 * Redaction removes secrets. It deliberately does NOT enforce length — that is
 * validate()'s job, so stored text and searchable text always agree.
 *
 * Pure and dependency-free so it runs under both Deno and vitest.
 */

const URL_REGEX = /https?:\/\/[^\s)>\]"']+/gi;
const TOKEN_REGEX = /[A-Za-z0-9+/=_-]{20,}/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const ATTACHMENT_REGEX = /\[attachment[^\]]*\]/gi;

/** Beyond this length, even a digit-free run is treated as token-like. */
const ALWAYS_REDACT_LENGTH = 30;

/**
 * Real secrets (API keys, SHAs, base64 blobs) mix letters and digits. Ordinary
 * text that happens to be long — a repo path like "ryhertel/pingsocialocca", a
 * hyphenated branch name — does not. Requiring both classes keeps adapter titles
 * intact while still catching anything that looks like a credential.
 */
function looksLikeSecret(run: string): boolean {
  if (run.length >= ALWAYS_REDACT_LENGTH) return true;
  const hasLetter = /[A-Za-z]/.test(run);
  const hasDigit = /[0-9]/.test(run);
  return hasLetter && hasDigit;
}

export function redact(input: string): string {
  let result = input;

  // Code blocks first — they may contain URLs and tokens.
  result = result.replace(CODE_BLOCK_REGEX, '[code]');
  result = result.replace(URL_REGEX, '[link]');
  result = result.replace(TOKEN_REGEX, (match) => (looksLikeSecret(match) ? '[redacted]' : match));
  result = result.replace(ATTACHMENT_REGEX, '[attachment]');

  return result.trim();
}
