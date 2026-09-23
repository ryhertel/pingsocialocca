/**
 * Provider adapters — turn a raw webhook into a Ping event.
 *
 * Before this existed, ingest accepted only Ping's own JSON shape, so every
 * integration needed Zapier or a middleware function to reshape the payload.
 * An adapter moves that transform server-side: point a provider's webhook
 * straight at Ping and it works.
 *
 * ── The detection ladder (order is load-bearing) ────────────────────────────
 *   1. Explicit override   ?source=<id> or x-ping-source names an adapter.
 *                          No sniffing. The escape hatch for anything unusual.
 *   2. Provider header     x-github-event, stripe-signature, x-vercel-signature…
 *                          Unambiguous; zero false-positive risk.
 *   3. Native Ping schema  source + eventType + title all strings → no adaptation.
 *                          Existing callers are never hijacked.
 *   4. Body-shape sniff    Only for genuinely distinctive shapes. Keep this small.
 *   5. Nothing matched     → strict validate(), i.e. exactly today's behaviour.
 *
 * ── Rules for writing an adapter ────────────────────────────────────────────
 *   • Be total. detect() and adapt() must never throw on malformed input. The
 *     dispatcher catches anyway, but a throw means a silently dropped event.
 *   • Set severity explicitly: 0 ambient, 1 normal, 2 needs attention, 3 wake me.
 *   • Return 'ignore' for events you recognise but do not want to show. A non-2xx
 *     makes the provider's UI show a broken hook and retry forever.
 *   • Return 'ack' for handshakes that must echo a challenge.
 *   • Keep titles free of redaction landmines: no full SHAs, no long mixed
 *     letter+digit runs. Truncate branch and repo segments (see truncate()).
 *   • Pass the provider's delivery id as dedupeKey so retries collapse to one row.
 *
 * Pure and dependency-free (no Deno globals, no crypto, no I/O) so the same file
 * runs under Deno, under vitest, and in the browser for the payload preview.
 */

export type PingEventType =
  | 'success' | 'error' | 'message' | 'thinking' | 'warning' | 'incident' | 'deploy';

export interface AdaptedEvent {
  source: string;
  eventType: PingEventType;
  title: string;
  body?: string;
  tags?: string[];
  severity: 0 | 1 | 2 | 3;
  /** The provider's own delivery/event id, hashed by the caller into a stable row id. */
  dedupeKey?: string;
}

export type AdaptResult =
  | { kind: 'event'; event: AdaptedEvent }
  | { kind: 'ack'; body: Record<string, unknown> }
  | { kind: 'ignore'; reason: string }
  | null;

export interface RawRequest {
  /** Header names lowercased by the caller. */
  headers: Record<string, string>;
  query: Record<string, string>;
  /** Already JSON.parse'd; may be any shape. */
  body: unknown;
}

export interface Adapter {
  id: string;
  detect(req: RawRequest): boolean;
  adapt(req: RawRequest): AdaptResult;
}

// ── Helpers ──

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function str(value: unknown, max = 500): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Safe nested read: dig(body, 'repository', 'full_name'). */
function dig(root: unknown, ...path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** First line only, whitespace collapsed — commit and issue text is multi-line. */
function firstLine(value: string, max: number): string {
  const line = value.split('\n')[0].replace(/\s+/g, ' ').trim();
  return line.length > max ? line.slice(0, max - 1) + '…' : line;
}

function tagList(...values: Array<string | null | undefined>): string[] {
  return values.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(0, 8);
}

// ── GitHub ──

const githubAdapter: Adapter = {
  id: 'github',

  detect(req) {
    return typeof req.headers['x-github-event'] === 'string' || req.query.source === 'github';
  },

  adapt(req) {
    const b = obj(req.body);
    const event = str(req.headers['x-github-event'], 40) ?? '';
    const delivery = str(req.headers['x-github-delivery'], 64) ?? undefined;
    const repo = str(dig(b, 'repository', 'full_name'), 60) ?? 'repo';
    const base = { source: 'github', dedupeKey: delivery };

    // GitHub POSTs this the instant you click "Add webhook". A non-2xx shows a red X.
    if (event === 'ping') {
      return { kind: 'event', event: {
        ...base,
        eventType: 'success',
        severity: 0,
        title: `GitHub webhook connected: ${repo}`,
        body: str(b.zen, 120) ?? undefined,
        tags: tagList('github', 'ping'),
      } };
    }

    if (event === 'push') {
      const ref = str(b.ref, 200) ?? '';
      const branch = ref.replace('refs/heads/', '').slice(0, 30);
      const who = str(dig(b, 'pusher', 'name'), 40) ?? 'someone';
      const count = Array.isArray(b.commits) ? b.commits.length : 0;
      const message = str(dig(b, 'head_commit', 'message'), 500);

      if (b.deleted === true) {
        return { kind: 'event', event: {
          ...base,
          eventType: 'warning',
          severity: 1,
          title: `Branch ${branch} deleted in ${repo}`,
          tags: tagList('github', 'push', branch),
        } };
      }

      return { kind: 'event', event: {
        ...base,
        eventType: 'deploy',
        severity: 1,
        title: `${who} pushed ${count} commit${count === 1 ? '' : 's'} to ${repo} ${branch}`,
        body: message ? firstLine(message, 200) : undefined,
        tags: tagList('github', 'push', branch),
      } };
    }

    if (event === 'workflow_run' || event === 'check_suite') {
      if (b.action !== 'completed') {
        return { kind: 'ignore', reason: `${event}:${String(b.action)}` };
      }
      const run = obj(event === 'workflow_run' ? b.workflow_run : b.check_suite);
      const conclusion = str(run.conclusion, 20) ?? 'unknown';
      const name = str(run.name, 40) ?? 'CI';
      const passed = conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped';
      return { kind: 'event', event: {
        ...base,
        eventType: passed ? 'success' : 'error',
        severity: passed ? 1 : 2,
        title: passed ? `CI passed: ${name} on ${repo}` : `CI failed: ${name} on ${repo}`,
        body: `Branch ${str(run.head_branch, 30) ?? 'unknown'} — ${conclusion}`,
        tags: tagList('github', 'ci', conclusion),
      } };
    }

    if (event === 'deployment_status') {
      const state = str(dig(b, 'deployment_status', 'state'), 20) ?? 'unknown';
      if (state === 'pending' || state === 'queued' || state === 'in_progress') {
        return { kind: 'ignore', reason: `deployment_status:${state}` };
      }
      const environment = str(dig(b, 'deployment_status', 'environment'), 30)
        ?? str(dig(b, 'deployment', 'environment'), 30)
        ?? 'production';
      const failed = state === 'failure' || state === 'error';
      return { kind: 'event', event: {
        ...base,
        eventType: failed ? 'error' : 'deploy',
        severity: failed ? 2 : 1,
        title: failed ? `Deploy to ${environment} failed` : `Deployed ${repo} to ${environment}`,
        tags: tagList('github', 'deploy', environment),
      } };
    }

    if (event === 'issues') {
      const action = str(b.action, 20) ?? '';
      if (action !== 'opened' && action !== 'closed' && action !== 'reopened') {
        return { kind: 'ignore', reason: `issues:${action}` };
      }
      const number = num(dig(b, 'issue', 'number')) ?? 0;
      const issueTitle = str(dig(b, 'issue', 'title'), 500) ?? 'Untitled';
      const who = str(dig(b, 'issue', 'user', 'login'), 40) ?? 'someone';
      const rawLabels = dig(b, 'issue', 'labels');
      const labels = Array.isArray(rawLabels)
        ? rawLabels.map((l) => str(dig(l, 'name'), 40)).filter((l): l is string => l !== null).slice(0, 3)
        : [];
      const urgent = labels.some((l) => /^(bug|critical|p0|sev1|security)$/i.test(l));
      return { kind: 'event', event: {
        ...base,
        eventType: action === 'closed' ? 'success' : (urgent ? 'warning' : 'message'),
        severity: urgent ? 2 : 1,
        title: `Issue #${number} ${action} in ${repo}`,
        body: `${firstLine(issueTitle, 140)} — by ${who}`,
        tags: tagList('github', 'issue', ...labels),
      } };
    }

    if (event === 'pull_request') {
      const action = str(b.action, 20) ?? '';
      if (action !== 'opened' && action !== 'closed' && action !== 'ready_for_review') {
        return { kind: 'ignore', reason: `pull_request:${action}` };
      }
      const merged = dig(b, 'pull_request', 'merged') === true;
      const number = num(dig(b, 'pull_request', 'number')) ?? 0;
      const prTitle = str(dig(b, 'pull_request', 'title'), 500) ?? 'Untitled';
      return { kind: 'event', event: {
        ...base,
        eventType: merged ? 'deploy' : 'message',
        severity: 1,
        title: merged ? `PR #${number} merged in ${repo}` : `PR #${number} ${action} in ${repo}`,
        body: firstLine(prTitle, 180),
        tags: tagList('github', 'pr'),
      } };
    }

    // Recognised sender, uninteresting event: 200 so GitHub stops retrying.
    return { kind: 'ignore', reason: `github:${event || 'unknown'}` };
  },
};

// ── Stripe ──

const STRIPE_FAILURE = /(failed|payment_failed|dispute|refund)/i;
const STRIPE_SUCCESS = /(succeeded|paid|created|completed)/i;

function formatAmount(amountMinor: number | null, currency: string | null): string | null {
  if (amountMinor === null) return null;
  const code = (currency ?? 'usd').toUpperCase().slice(0, 4);
  return `${(amountMinor / 100).toFixed(2)} ${code}`;
}

const stripeAdapter: Adapter = {
  id: 'stripe',

  detect(req) {
    return typeof req.headers['stripe-signature'] === 'string' || req.query.source === 'stripe';
  },

  adapt(req) {
    const b = obj(req.body);
    const type = str(b.type, 60) ?? '';
    if (!type) return { kind: 'ignore', reason: 'stripe:no-type' };

    const object = obj(dig(b, 'data', 'object'));
    const amount = formatAmount(
      num(object.amount) ?? num(object.amount_paid) ?? num(object.amount_total),
      str(object.currency, 8),
    );
    const base = { source: 'stripe', dedupeKey: str(b.id, 64) ?? undefined };
    const noun = type.split('.')[0].replace(/_/g, ' ');

    if (STRIPE_FAILURE.test(type)) {
      return { kind: 'event', event: {
        ...base,
        eventType: 'error',
        severity: 2,
        title: `Stripe ${noun} failed`,
        body: amount ? `${amount} — ${type}` : type,
        tags: tagList('stripe', 'payment'),
      } };
    }

    if (STRIPE_SUCCESS.test(type)) {
      return { kind: 'event', event: {
        ...base,
        eventType: 'success',
        severity: 1,
        title: amount ? `Payment received: ${amount}` : `Stripe ${noun} succeeded`,
        body: type,
        tags: tagList('stripe', 'payment'),
      } };
    }

    return { kind: 'ignore', reason: `stripe:${type}` };
  },
};

// ── Vercel ──

const vercelAdapter: Adapter = {
  id: 'vercel',

  detect(req) {
    return typeof req.headers['x-vercel-signature'] === 'string' || req.query.source === 'vercel';
  },

  adapt(req) {
    const b = obj(req.body);
    const type = str(b.type, 60) ?? '';
    const payload = obj(b.payload);
    const project = str(dig(payload, 'project', 'name'), 40)
      ?? str(dig(payload, 'deployment', 'name'), 40)
      ?? 'project';
    const target = str(payload.target, 20) ?? 'production';
    const base = { source: 'vercel', dedupeKey: str(b.id, 64) ?? undefined };

    if (type === 'deployment.succeeded' || type === 'deployment.ready') {
      return { kind: 'event', event: {
        ...base,
        eventType: 'deploy',
        severity: 1,
        title: `Deployed ${project} to ${target}`,
        tags: tagList('vercel', 'deploy', target),
      } };
    }

    if (type === 'deployment.error' || type === 'deployment.canceled') {
      const failed = type === 'deployment.error';
      return { kind: 'event', event: {
        ...base,
        eventType: failed ? 'error' : 'warning',
        severity: failed ? 2 : 1,
        title: failed ? `Build failed: ${project}` : `Build canceled: ${project}`,
        body: `Target ${target}`,
        tags: tagList('vercel', 'build', target),
      } };
    }

    return { kind: 'ignore', reason: `vercel:${type || 'unknown'}` };
  },
};

// ── Sentry ──

/** Sentry's level vocabulary, mapped onto Ping's intensity channel. */
const SENTRY_SEVERITY: Record<string, 0 | 1 | 2 | 3> = {
  fatal: 3,
  error: 2,
  warning: 1,
  info: 0,
  debug: 0,
};

const sentryAdapter: Adapter = {
  id: 'sentry',

  detect(req) {
    return typeof req.headers['sentry-hook-resource'] === 'string'
      || req.query.source === 'sentry';
  },

  adapt(req) {
    const b = obj(req.body);
    const resource = str(req.headers['sentry-hook-resource'], 40) ?? '';

    // Integration Platform: { action, data: { event | issue }, actor }
    const data = obj(b.data);
    const event = obj(data.event);
    const issue = obj(data.issue);

    // Legacy webhook integration posts a flat body instead.
    const legacyMessage = str(b.message, 500);
    const legacyCulprit = str(b.culprit, 120);
    const project = str(b.project_name, 60)
      ?? str(b.project, 60)
      ?? str(dig(event, 'project'), 60)
      ?? 'project';

    const level = (str(event.level, 20) ?? str(b.level, 20) ?? 'error').toLowerCase();
    const severity = SENTRY_SEVERITY[level] ?? 2;

    const base = {
      source: 'sentry',
      dedupeKey: str(event.event_id, 64) ?? str(b.id, 64) ?? str(issue.id, 64) ?? undefined,
    };

    // An issue transitioning to resolved or ignored is good news, not an alarm.
    if (resource === 'issue' || issue.id) {
      const action = str(b.action, 20) ?? '';
      if (action === 'resolved' || action === 'ignored') {
        return { kind: 'event', event: {
          ...base,
          eventType: 'success',
          severity: 0,
          title: `Sentry issue ${action}: ${firstLine(str(issue.title, 200) ?? 'issue', 70)}`,
          tags: tagList('sentry', 'issue', action),
        } };
      }
      if (action && action !== 'created' && action !== 'unresolved') {
        return { kind: 'ignore', reason: `sentry:issue:${action}` };
      }
    }

    const title = str(event.title, 300)
      ?? str(issue.title, 300)
      ?? legacyMessage
      ?? legacyCulprit;

    if (!title) return { kind: 'ignore', reason: `sentry:${resource || 'unknown'}` };

    const detail = str(event.culprit, 200)
      ?? legacyCulprit
      ?? str(dig(event, 'metadata', 'value'), 200);

    return { kind: 'event', event: {
      ...base,
      // fatal reads as an incident; everything else is an error to look at.
      eventType: severity >= 3 ? 'incident' : 'error',
      severity,
      title: firstLine(title, 120),
      body: detail ? `${firstLine(detail, 160)} — ${project}` : project,
      tags: tagList('sentry', level, str(event.environment, 30)),
    } };
  },
};

// ── Linear ──

/** Linear priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low. */
function linearSeverity(priority: unknown): 0 | 1 | 2 | 3 {
  const p = num(priority);
  if (p === 1) return 2;
  if (p === 2) return 1;
  return 1;
}

const linearAdapter: Adapter = {
  id: 'linear',

  detect(req) {
    return typeof req.headers['linear-delivery'] === 'string'
      || typeof req.headers['linear-event'] === 'string'
      || req.query.source === 'linear';
  },

  adapt(req) {
    const b = obj(req.body);
    const type = str(b.type, 40) ?? str(req.headers['linear-event'], 40) ?? '';
    const action = str(b.action, 20) ?? '';
    const data = obj(b.data);
    const base = {
      source: 'linear',
      dedupeKey: str(req.headers['linear-delivery'], 64) ?? undefined,
    };

    if (action === 'remove') return { kind: 'ignore', reason: `linear:${type}:remove` };

    if (type === 'Issue') {
      const identifier = str(data.identifier, 20) ?? 'issue';
      const issueTitle = str(data.title, 300) ?? 'Untitled';
      const state = str(dig(data, 'state', 'name'), 40);
      const assignee = str(dig(data, 'assignee', 'name'), 40);
      const labels = Array.isArray(data.labels)
        ? (data.labels as unknown[]).map((l) => str(dig(l, 'name'), 30)).filter((l): l is string => l !== null).slice(0, 3)
        : [];

      // Reaching a done state is the one Linear event worth celebrating.
      const done = /^(done|completed|merged|shipped)$/i.test(state ?? '');
      const blocked = labels.some((l) => /^(bug|blocked|regression)$/i.test(l));

      return { kind: 'event', event: {
        ...base,
        eventType: done ? 'success' : (blocked ? 'warning' : 'message'),
        severity: blocked ? 2 : linearSeverity(data.priority),
        title: state
          ? `${identifier} moved to ${state}`
          : `${identifier} ${action === 'create' ? 'created' : 'updated'}`,
        body: assignee ? `${firstLine(issueTitle, 140)} — ${assignee}` : firstLine(issueTitle, 160),
        tags: tagList('linear', 'issue', ...labels),
      } };
    }

    if (type === 'Comment') {
      const identifier = str(dig(data, 'issue', 'identifier'), 20) ?? 'issue';
      const who = str(dig(data, 'user', 'name'), 40) ?? 'someone';
      const text = str(data.body, 500) ?? '';
      return { kind: 'event', event: {
        ...base,
        eventType: 'message',
        severity: 1,
        title: `${who} commented on ${identifier}`,
        body: text ? firstLine(text, 180) : undefined,
        tags: tagList('linear', 'comment'),
      } };
    }

    if (type === 'Project') {
      const name = str(data.name, 60) ?? 'project';
      const state = str(data.state, 40);
      return { kind: 'event', event: {
        ...base,
        eventType: 'message',
        severity: 1,
        title: state ? `Project ${name} is ${state}` : `Project ${name} updated`,
        tags: tagList('linear', 'project'),
      } };
    }

    return { kind: 'ignore', reason: `linear:${type || 'unknown'}` };
  },
};

// ── Slack ──

/**
 * Subtypes that are edits and housekeeping rather than someone saying something.
 * Without this, editing a message re-fires the whole reaction.
 */
const SLACK_IGNORED_SUBTYPES = new Set([
  'message_changed',
  'message_deleted',
  'channel_join',
  'channel_leave',
  'bot_message',
  'thread_broadcast',
]);

const slackAdapter: Adapter = {
  id: 'slack',

  detect(req) {
    const b = obj(req.body);
    return typeof req.headers['x-slack-signature'] === 'string'
      || req.query.source === 'slack'
      // The handshake arrives before Slack will send the signature header.
      || b.type === 'url_verification';
  },

  adapt(req) {
    const b = obj(req.body);

    // Slack will not enable an endpoint until it echoes this back.
    if (b.type === 'url_verification') {
      const challenge = str(b.challenge, 500);
      return challenge
        ? { kind: 'ack', body: { challenge } }
        : { kind: 'ignore', reason: 'slack:bad-handshake' };
    }

    if (b.type !== 'event_callback') {
      return { kind: 'ignore', reason: `slack:${str(b.type, 40) ?? 'unknown'}` };
    }

    const event = obj(b.event);
    const eventType = str(event.type, 40) ?? '';
    const subtype = str(event.subtype, 40) ?? '';
    const base = { source: 'slack', dedupeKey: str(b.event_id, 64) ?? undefined };

    // Never react to our own kind. A bot posting into a watched channel would
    // otherwise be able to drive the face in a loop.
    if (event.bot_id || SLACK_IGNORED_SUBTYPES.has(subtype)) {
      return { kind: 'ignore', reason: `slack:${subtype || 'bot'}` };
    }

    if (eventType !== 'message' && eventType !== 'app_mention') {
      return { kind: 'ignore', reason: `slack:${eventType || 'unknown'}` };
    }

    const text = str(event.text, 1000);
    if (!text) return { kind: 'ignore', reason: 'slack:empty' };

    const channel = str(event.channel, 40) ?? 'a channel';
    const mention = eventType === 'app_mention';

    return { kind: 'event', event: {
      ...base,
      eventType: 'message',
      // A direct mention is aimed at you; an ordinary channel message is not.
      severity: mention ? 2 : 1,
      title: mention ? `Mentioned in ${channel}` : `New message in ${channel}`,
      body: firstLine(text, 200),
      tags: tagList('slack', mention ? 'mention' : 'message'),
    } };
  },
};

// ── Email ──

/** Where a quoted reply starts. Everything from here down is someone else's text. */
const REPLY_MARKERS = [
  /^>/,
  /^On .+ wrote:$/i,
  /^-{2,}\s*Original Message\s*-{2,}/i,
  /^From:\s/i,
  /^_{5,}$/,
];

/** Signature delimiter per RFC 3676: a line of exactly "-- ". */
const SIGNATURE_MARKER = /^--\s?$/;

/** Boilerplate that would otherwise become the body of every automated email. */
const NOISE_LINE = /^(sent from my |unsubscribe|view (this|it) in|if you (did not|didn't)|this (email|message) was sent)/i;

/**
 * Pull the first line of actual content out of an email body.
 *
 * Email is the messiest input Ping accepts: quoted replies, signatures,
 * footers, and hard-wrapped paragraphs. Taking the raw first line gives you
 * "Hi there," as often as not, so we skip the obvious noise and stop at the
 * first marker that means the human part has ended.
 */
function cleanEmailBody(raw: string, max: number): string | null {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (SIGNATURE_MARKER.test(trimmed)) break;
    if (REPLY_MARKERS.some((re) => re.test(trimmed))) break;
    if (trimmed.length === 0) continue;
    if (NOISE_LINE.test(trimmed)) continue;
    kept.push(trimmed);
    // Two lines is enough to carry a sentence that was hard-wrapped.
    if (kept.join(' ').length >= max) break;
  }

  if (kept.length === 0) return null;
  const joined = kept.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > max ? joined.slice(0, max - 1) + '…' : joined;
}

/** "alerts@stripe.com" → "stripe.com", for a tag you can filter on. */
function senderDomain(from: string): string | null {
  const match = /<?([^<>@\s]+)@([^<>@\s]+?)>?$/.exec(from.trim());
  const domain = match?.[2];
  return domain ? domain.toLowerCase().slice(0, 40) : null;
}

/**
 * Inbound email, delivered by the mail relay (see cloudflare/email-worker.js).
 *
 * Reached only through the explicit ?source=email override — never by sniffing,
 * because the shape is generic enough that a sniff would claim other payloads.
 */
const emailAdapter: Adapter = {
  id: 'email',

  detect(req) {
    return req.query.source === 'email' || req.headers['x-ping-source'] === 'email';
  },

  adapt(req) {
    const b = obj(req.body);
    const subject = str(b.subject, 300);
    const text = str(b.text, 20000);
    const from = str(b.from, 200) ?? '';
    const domain = senderDomain(from);

    const body = text ? cleanEmailBody(text, 300) : null;

    // A subject is the natural title. Without one, promote the first real line
    // of the body rather than dropping a message that clearly arrived.
    const title = subject
      ? firstLine(subject, 120)
      : (body ? firstLine(body, 120) : null);

    if (!title) return { kind: 'ignore', reason: 'email:empty' };

    return { kind: 'event', event: {
      source: 'email',
      eventType: 'message',
      severity: 1,
      title,
      // Avoid repeating the subject back when there is no distinct body.
      body: body && body !== title ? body : undefined,
      tags: tagList('email', domain),
      dedupeKey: str(b.messageId, 200) ?? undefined,
    } };
  },
};

// ── Generic ──

const GENERIC_TITLE_KEYS = ['title', 'text', 'message', 'subject', 'summary'];
const GENERIC_BODY_KEYS = ['body', 'description', 'details', 'content'];

/**
 * A loose fallback so any HTTP-capable service works: curl, a shell script, a cron
 * job. Claims a payload that carries a title-ish string but is not native Ping
 * JSON. Last in the list, so every provider adapter wins first.
 */
const genericAdapter: Adapter = {
  id: 'generic',

  detect(req) {
    if (req.query.source === 'generic') return true;
    const b = obj(req.body);
    return GENERIC_TITLE_KEYS.some((k) => typeof b[k] === 'string' && (b[k] as string).length > 0);
  },

  adapt(req) {
    const b = obj(req.body);
    let title: string | null = null;
    for (const key of GENERIC_TITLE_KEYS) {
      title = str(b[key], 500);
      if (title) break;
    }
    if (!title) return { kind: 'ignore', reason: 'generic:no-title' };

    let body: string | null = null;
    for (const key of GENERIC_BODY_KEYS) {
      body = str(b[key], 500);
      if (body) break;
    }

    const requestedType = str(b.eventType, 20) ?? str(b.type, 20) ?? str(b.level, 20);
    const eventType: PingEventType =
      requestedType && ['success', 'error', 'message', 'thinking', 'warning', 'incident', 'deploy']
        .includes(requestedType)
        ? requestedType as PingEventType
        : 'message';

    const severity = num(b.severity);
    return { kind: 'event', event: {
      source: str(b.source, 40) ?? 'generic',
      eventType,
      severity: (severity === null ? 1 : Math.max(0, Math.min(3, Math.round(severity)))) as 0 | 1 | 2 | 3,
      title: firstLine(title, 120),
      body: body ? firstLine(body, 300) : undefined,
      tags: Array.isArray(b.tags)
        ? tagList(...(b.tags as unknown[]).map((t) => str(t, 40)))
        : undefined,
    } };
  },
};

// ── Dispatcher ──

/** Provider adapters first; the loose generic fallback last. */
const ADAPTERS: Adapter[] = [
  githubAdapter,
  stripeAdapter,
  vercelAdapter,
  sentryAdapter,
  linearAdapter,
  slackAdapter,
  emailAdapter,
  genericAdapter,
];

/** Tier 3: a payload already in Ping's shape is never touched by an adapter. */
export function looksNative(body: unknown): boolean {
  const b = obj(body);
  return typeof b.source === 'string'
    && typeof b.eventType === 'string'
    && typeof b.title === 'string';
}

export interface AdaptOutcome {
  id: string;
  result: AdaptResult;
}

/**
 * Walk the ladder. Returns null when nothing claims the request, which means the
 * caller should fall through to strict validation — today's exact behaviour.
 */
export function adaptRequest(req: RawRequest): AdaptOutcome | null {
  // Tier 1: explicit override wins outright, no sniffing.
  const forced = req.query.source ?? req.headers['x-ping-source'];
  if (forced) {
    const adapter = ADAPTERS.find((a) => a.id === forced);
    if (adapter) {
      try {
        const result = adapter.adapt(req);
        return result ? { id: adapter.id, result } : null;
      } catch {
        return null;
      }
    }
  }

  // Tier 2 and 4: detection.
  for (const adapter of ADAPTERS) {
    let claimed = false;
    try {
      claimed = adapter.detect(req);
    } catch {
      claimed = false;
    }
    if (!claimed) continue;

    // Tier 3: never hijack a native payload.
    if (looksNative(req.body)) return null;

    try {
      const result = adapter.adapt(req);
      if (result) return { id: adapter.id, result };
    } catch {
      // A bug in one adapter must degrade to "unknown payload", not 500 the endpoint.
    }
  }

  return null;
}

/** Exposed so the UI can list what Ping understands without duplicating the list. */
export function adapterIds(): string[] {
  return ADAPTERS.map((a) => a.id);
}
