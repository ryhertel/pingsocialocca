/**
 * Ping email relay — a Cloudflare Email Worker.
 *
 * Supabase cannot receive email, so this sits in front: Cloudflare accepts the
 * message, this Worker reduces it to a small JSON object, and POSTs that to
 * Ping's existing /ingest endpoint with ?source=email.
 *
 * Routing and auth are deliberately separate:
 *   • the address local-part (the alias) says WHICH channel the mail belongs to
 *   • PING_EMAIL_SECRET says the request came from this relay
 *
 * That split matters because an email address is not a secret in practice — it
 * ends up in forwarding rules, address books and other people's inboxes. An
 * alias alone can route; it cannot authorize.
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *  1. Cloudflare dashboard → your domain → Email → Email Routing, enable it.
 *     Cloudflare adds the MX records for you.
 *  2. Workers & Pages → Create → Worker. Paste this file.
 *  3. Settings → Variables:
 *       PING_INGEST_URL   https://<project>.supabase.co/functions/v1/ingest
 *       PING_EMAIL_SECRET  a long random string (encrypted)
 *  4. Set the SAME PING_EMAIL_SECRET as a Supabase edge function secret.
 *  5. Email Routing → Routing rules → Catch-all → send to this Worker.
 *
 * Catch-all is required: every channel gets its own alias, so there is no fixed
 * list of addresses to enumerate.
 */

/** Matches the EMAIL_ALIAS_REGEX in supabase/functions/ingest/index.ts. */
const ALIAS_PATTERN = /^[0-9a-f]{24}$/;

/** Anything larger is almost certainly attachments we are going to discard anyway. */
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Read the message body, stopping early rather than buffering a large mail.
 * Cloudflare gives us a stream; attachments can make that tens of megabytes.
 */
async function readBodyText(message) {
  const reader = message.raw.getReader();
  const chunks = [];
  let total = 0;

  while (total < MAX_BODY_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk.subarray(0, Math.min(chunk.length, total - offset)), offset);
    offset += chunk.length;
    if (offset >= total) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

/**
 * Pull the plain-text part out of a raw MIME message.
 *
 * This is intentionally shallow: we want the first line of human text, not a
 * faithful MIME tree. Prefer text/plain; fall back to stripping tags from HTML;
 * give up gracefully rather than throwing, because a dropped event is worse
 * than a slightly wrong one.
 */
function extractPlainText(raw) {
  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd === -1) return '';

  const plain = /content-type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i.exec(raw);
  if (plain?.[1]) return decodeQuotedPrintable(plain[1]);

  const html = /content-type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i.exec(raw);
  if (html?.[1]) {
    return decodeQuotedPrintable(html[1])
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Not multipart: everything after the headers is the body.
  return raw.slice(headerEnd).trim();
}

/** Quoted-printable is common in automated mail and turns text into mojibake if ignored. */
function decodeQuotedPrintable(input) {
  return input
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export default {
  async email(message, env) {
    const alias = String(message.to || '').split('@')[0].trim().toLowerCase();

    // Unknown address: accept silently. Rejecting tells a sender which aliases
    // are live, and bouncing generates backscatter.
    if (!ALIAS_PATTERN.test(alias)) return;

    if (!env.PING_INGEST_URL || !env.PING_EMAIL_SECRET) {
      console.error('email-worker: PING_INGEST_URL or PING_EMAIL_SECRET is not set');
      return;
    }

    let text = '';
    try {
      text = extractPlainText(await readBodyText(message));
    } catch (err) {
      // A malformed body should still produce an event from the subject.
      console.error('email-worker: body parse failed', err?.message);
    }

    const payload = {
      from: message.from || '',
      subject: message.headers.get('subject') || '',
      messageId: message.headers.get('message-id') || '',
      text,
    };

    try {
      const res = await fetch(`${env.PING_INGEST_URL}?source=email&alias=${alias}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ping-email-secret': env.PING_EMAIL_SECRET,
        },
        body: JSON.stringify(payload),
      });
      // Log status only — never the payload, which is someone's mail.
      if (!res.ok) console.error('email-worker: ingest returned', res.status);
    } catch (err) {
      console.error('email-worker: ingest unreachable', err?.message);
    }
  },
};
