import { describe, it, expect } from 'vitest';
import { adaptRequest } from '../../supabase/functions/ingest/adapters.ts';
import type { RawRequest } from '../../supabase/functions/ingest/adapters.ts';
import { validate } from '../../supabase/functions/ingest/validate.ts';
import { redact } from '../../supabase/functions/ingest/redact.ts';

function req(headers: Record<string, string>, body: unknown): RawRequest {
  return { headers, query: {}, body };
}

function eventOf(outcome: ReturnType<typeof adaptRequest>) {
  expect(outcome).not.toBeNull();
  expect(outcome!.result?.kind).toBe('event');
  if (outcome!.result?.kind !== 'event') throw new Error('not an event');
  return outcome!.result.event;
}

// ── Sentry ──

const sentryAlert = {
  action: 'triggered',
  data: {
    event: {
      event_id: 'abc123def456',
      title: 'TypeError: Cannot read properties of undefined',
      level: 'error',
      environment: 'production',
      culprit: 'api/users.ts in getUser',
      project: 'ping',
    },
  },
};

const sentryFatal = {
  action: 'triggered',
  data: { event: { event_id: 'f1', title: 'OOM killed', level: 'fatal', project: 'ping' } },
};

const sentryLegacy = {
  id: '99',
  project: 'ping',
  project_name: 'Ping',
  level: 'warning',
  message: 'Slow query detected',
  culprit: 'db/query.ts',
};

describe('sentryAdapter', () => {
  it('maps an error alert to an error at severity 2', () => {
    const e = eventOf(adaptRequest(req({ 'sentry-hook-resource': 'event_alert' }, sentryAlert)));
    expect(e.source).toBe('sentry');
    expect(e.eventType).toBe('error');
    expect(e.severity).toBe(2);
    expect(e.title).toContain('TypeError');
    expect(e.tags).toContain('production');
  });

  it('escalates fatal to an incident at severity 3', () => {
    const e = eventOf(adaptRequest(req({ 'sentry-hook-resource': 'event_alert' }, sentryFatal)));
    expect(e.eventType).toBe('incident');
    expect(e.severity).toBe(3);
  });

  it('reads the legacy flat webhook shape too', () => {
    const e = eventOf(adaptRequest(req({}, { ...sentryLegacy })));
    // No sentry header on the legacy integration, so route it explicitly.
    const viaOverride = eventOf(adaptRequest({ headers: {}, query: { source: 'sentry' }, body: sentryLegacy }));
    expect(viaOverride.title).toContain('Slow query');
    expect(viaOverride.severity).toBe(1);
    expect(e).toBeDefined();
  });

  it('treats a resolved issue as good news, not another alarm', () => {
    const e = eventOf(adaptRequest(req(
      { 'sentry-hook-resource': 'issue' },
      { action: 'resolved', data: { issue: { id: '7', title: 'TypeError in users' } } },
    )));
    expect(e.eventType).toBe('success');
    expect(e.severity).toBe(0);
    expect(e.title).toContain('resolved');
  });

  it('ignores issue actions that are not worth surfacing', () => {
    const outcome = adaptRequest(req(
      { 'sentry-hook-resource': 'issue' },
      { action: 'assigned', data: { issue: { id: '7', title: 'x' } } },
    ));
    expect(outcome!.result?.kind).toBe('ignore');
  });
});

// ── Linear ──

const linearIssueDone = {
  action: 'update',
  type: 'Issue',
  data: {
    identifier: 'ENG-142',
    title: 'Fix auth token refresh',
    priority: 2,
    state: { name: 'Done' },
    assignee: { name: 'Alice' },
    labels: [],
  },
};

const linearIssueBug = {
  action: 'create',
  type: 'Issue',
  data: {
    identifier: 'ENG-200',
    title: 'Ingest returns 400 for raw webhooks',
    priority: 1,
    state: { name: 'Todo' },
    labels: [{ name: 'bug' }],
  },
};

const linearComment = {
  action: 'create',
  type: 'Comment',
  data: { body: 'Shipped this morning', user: { name: 'Bob' }, issue: { identifier: 'ENG-142' } },
};

describe('linearAdapter', () => {
  it('celebrates an issue reaching a done state', () => {
    const e = eventOf(adaptRequest(req({ 'linear-delivery': 'd1', 'linear-event': 'Issue' }, linearIssueDone)));
    expect(e.source).toBe('linear');
    expect(e.eventType).toBe('success');
    expect(e.title).toContain('ENG-142');
    expect(e.title).toContain('Done');
    expect(e.body).toContain('Alice');
  });

  it('raises a bug-labelled issue to a warning at severity 2', () => {
    const e = eventOf(adaptRequest(req({ 'linear-delivery': 'd2', 'linear-event': 'Issue' }, linearIssueBug)));
    expect(e.eventType).toBe('warning');
    expect(e.severity).toBe(2);
    expect(e.tags).toContain('bug');
  });

  it('maps a comment to a message naming who wrote it', () => {
    const e = eventOf(adaptRequest(req({ 'linear-delivery': 'd3', 'linear-event': 'Comment' }, linearComment)));
    expect(e.title).toContain('Bob');
    expect(e.title).toContain('ENG-142');
    expect(e.body).toBe('Shipped this morning');
  });

  it('ignores deletions', () => {
    const outcome = adaptRequest(req({ 'linear-delivery': 'd4' }, { ...linearIssueDone, action: 'remove' }));
    expect(outcome!.result?.kind).toBe('ignore');
  });
});

// ── Slack ──

describe('slackAdapter', () => {
  it('answers the url_verification handshake with the challenge', () => {
    const outcome = adaptRequest(req({}, { type: 'url_verification', challenge: 'abc123' }));
    expect(outcome!.result?.kind).toBe('ack');
    if (outcome!.result?.kind !== 'ack') throw new Error('not an ack');
    expect(outcome!.result.body).toEqual({ challenge: 'abc123' });
  });

  it('maps a channel message', () => {
    const e = eventOf(adaptRequest(req({ 'x-slack-signature': 'v0=abc' }, {
      type: 'event_callback',
      event_id: 'Ev1',
      event: { type: 'message', text: 'deploy going out in 10', channel: 'C123', user: 'U1' },
    })));
    expect(e.source).toBe('slack');
    expect(e.severity).toBe(1);
    expect(e.body).toBe('deploy going out in 10');
  });

  it('treats a direct mention as needing attention', () => {
    const e = eventOf(adaptRequest(req({ 'x-slack-signature': 'v0=abc' }, {
      type: 'event_callback',
      event_id: 'Ev2',
      event: { type: 'app_mention', text: 'can you look at this?', channel: 'C123', user: 'U1' },
    })));
    expect(e.severity).toBe(2);
    expect(e.title).toContain('Mentioned');
  });

  it('never reacts to a bot message, which would let Ping drive itself in a loop', () => {
    const fromBot = adaptRequest(req({ 'x-slack-signature': 'v0=abc' }, {
      type: 'event_callback',
      event: { type: 'message', text: 'I am a bot', channel: 'C1', bot_id: 'B1' },
    }));
    expect(fromBot!.result?.kind).toBe('ignore');

    const botSubtype = adaptRequest(req({ 'x-slack-signature': 'v0=abc' }, {
      type: 'event_callback',
      event: { type: 'message', text: 'also a bot', channel: 'C1', subtype: 'bot_message' },
    }));
    expect(botSubtype!.result?.kind).toBe('ignore');
  });

  it('ignores edits and joins rather than re-firing the reaction', () => {
    for (const subtype of ['message_changed', 'message_deleted', 'channel_join']) {
      const outcome = adaptRequest(req({ 'x-slack-signature': 'v0=abc' }, {
        type: 'event_callback',
        event: { type: 'message', text: 'x', channel: 'C1', subtype },
      }));
      expect(outcome!.result?.kind, subtype).toBe('ignore');
    }
  });
});

// ── Cross-cutting ──

const ALL: Array<{ name: string; headers: Record<string, string>; body: unknown }> = [
  { name: 'sentryAlert', headers: { 'sentry-hook-resource': 'event_alert' }, body: sentryAlert },
  { name: 'sentryFatal', headers: { 'sentry-hook-resource': 'event_alert' }, body: sentryFatal },
  { name: 'linearIssueDone', headers: { 'linear-delivery': 'd1', 'linear-event': 'Issue' }, body: linearIssueDone },
  { name: 'linearIssueBug', headers: { 'linear-delivery': 'd2', 'linear-event': 'Issue' }, body: linearIssueBug },
  { name: 'linearComment', headers: { 'linear-delivery': 'd3', 'linear-event': 'Comment' }, body: linearComment },
];

describe('new adapters — the shared contract', () => {
  it('never throws when any top-level key is missing', () => {
    for (const f of ALL) {
      for (const key of Object.keys(f.body as Record<string, unknown>)) {
        const mutated = { ...(f.body as Record<string, unknown>) };
        delete mutated[key];
        expect(() => adaptRequest(req(f.headers, mutated)), `${f.name} without ${key}`).not.toThrow();
      }
      expect(() => adaptRequest(req(f.headers, null))).not.toThrow();
      expect(() => adaptRequest(req(f.headers, 'a string'))).not.toThrow();
    }
  });

  it('produces output that survives lenient validation', () => {
    for (const f of ALL) {
      const outcome = adaptRequest(req(f.headers, f.body));
      if (!outcome || outcome.result?.kind !== 'event') continue;
      const result = validate(outcome.result.event, 'lenient');
      expect(result.ok, f.name).toBe(true);
      expect(result.event!.title.length).toBeLessThanOrEqual(120);
    }
  });

  it('builds titles that redaction leaves intact', () => {
    for (const f of ALL) {
      const outcome = adaptRequest(req(f.headers, f.body));
      if (!outcome || outcome.result?.kind !== 'event') continue;
      const { title } = outcome.result.event;
      expect(redact(title), `${f.name} title hit a redaction landmine`).toBe(title);
    }
  });

  it('never hijacks a native Ping payload', () => {
    const native = { source: 'curl', eventType: 'success', title: 'Hello' };
    for (const headers of [
      { 'sentry-hook-resource': 'event_alert' },
      { 'linear-delivery': 'd1' },
      { 'x-slack-signature': 'v0=abc' },
    ]) {
      expect(adaptRequest(req(headers, native)), JSON.stringify(headers)).toBeNull();
    }
  });
});
