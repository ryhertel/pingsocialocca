import { describe, it, expect } from 'vitest';
import { adaptRequest, looksNative } from '../../supabase/functions/ingest/adapters.ts';
import type { RawRequest } from '../../supabase/functions/ingest/adapters.ts';
import { validate } from '../../supabase/functions/ingest/validate.ts';
import { redact } from '../../supabase/functions/ingest/redact.ts';
import * as f from './fixtures/webhooks';

function req(headers: Record<string, string>, body: unknown, query: Record<string, string> = {}): RawRequest {
  return { headers, query, body };
}

/** Unwrap an outcome we expect to be a real event. */
function eventOf(outcome: ReturnType<typeof adaptRequest>) {
  expect(outcome).not.toBeNull();
  expect(outcome!.result?.kind).toBe('event');
  if (outcome!.result?.kind !== 'event') throw new Error('not an event');
  return outcome!.result.event;
}

describe('adaptRequest — GitHub', () => {
  it('maps a push to a deploy event naming the repo and branch', () => {
    const e = eventOf(adaptRequest(req({ 'x-github-event': 'push', 'x-github-delivery': 'abc-123' }, f.githubPush)));
    expect(e.source).toBe('github');
    expect(e.eventType).toBe('deploy');
    expect(e.severity).toBe(1);
    expect(e.title).toContain('ryhertel/pingsocialocca');
    expect(e.title).toContain('main');
    expect(e.title).toContain('2 commits');
    expect(e.dedupeKey).toBe('abc-123');
  });

  it('answers the first-contact ping with a real event, never an error', () => {
    const e = eventOf(adaptRequest(req({ 'x-github-event': 'ping' }, f.githubPing)));
    expect(e.eventType).toBe('success');
    expect(e.severity).toBe(0);
    expect(e.title).toContain('connected');
  });

  it('maps a failed workflow run to an error that needs attention', () => {
    const e = eventOf(adaptRequest(req({ 'x-github-event': 'workflow_run' }, f.githubWorkflowRunFailed)));
    expect(e.eventType).toBe('error');
    expect(e.severity).toBe(2);
    expect(e.title).toContain('CI failed');
  });

  it('raises severity for an issue labelled bug', () => {
    const e = eventOf(adaptRequest(req({ 'x-github-event': 'issues' }, f.githubIssueOpenedBug)));
    expect(e.eventType).toBe('warning');
    expect(e.severity).toBe(2);
    expect(e.tags).toContain('bug');
  });

  it('ignores uninteresting actions instead of rejecting them', () => {
    const outcome = adaptRequest(req({ 'x-github-event': 'issues' }, f.githubIssueLabeled));
    expect(outcome!.result?.kind).toBe('ignore');
  });
});

describe('adaptRequest — Stripe and Vercel', () => {
  it('puts the amount in the title of a successful payment', () => {
    const e = eventOf(adaptRequest(req({ 'stripe-signature': 't=1,v1=deadbeef' }, f.stripePaymentSucceeded)));
    expect(e.eventType).toBe('success');
    expect(e.title).toContain('49.99');
    expect(e.title).toContain('USD');
  });

  it('maps a failed charge to an error, not a celebration', () => {
    const e = eventOf(adaptRequest(req({ 'stripe-signature': 't=1,v1=deadbeef' }, f.stripeChargeFailed)));
    expect(e.eventType).toBe('error');
    expect(e.severity).toBe(2);
  });

  it('maps a Vercel build failure to an error', () => {
    const e = eventOf(adaptRequest(req({ 'x-vercel-signature': 'deadbeef' }, f.vercelDeploymentError)));
    expect(e.eventType).toBe('error');
    expect(e.severity).toBe(2);
    expect(e.title).toContain('ping');
  });

  it('maps a Vercel success to a deploy', () => {
    const e = eventOf(adaptRequest(req({ 'x-vercel-signature': 'deadbeef' }, f.vercelDeploymentSucceeded)));
    expect(e.eventType).toBe('deploy');
  });
});

describe('adaptRequest — the ladder', () => {
  it('never hijacks a native payload, even with a provider header present', () => {
    expect(adaptRequest(req({ 'x-github-event': 'push' }, f.nativePayload))).toBeNull();
    expect(looksNative(f.nativePayload)).toBe(true);
  });

  it('returns null for a payload nothing recognises', () => {
    expect(adaptRequest(req({}, f.unknownPayload))).toBeNull();
  });

  it('honours an explicit ?source= override without sniffing', () => {
    const outcome = adaptRequest(req({}, f.githubPush, { source: 'github' }));
    expect(outcome!.id).toBe('github');
  });

  it('accepts a loose payload through the generic fallback', () => {
    const e = eventOf(adaptRequest(req({}, { title: 'Backup finished', body: 'Nightly job' })));
    expect(e.source).toBe('generic');
    expect(e.title).toBe('Backup finished');
    expect(e.body).toBe('Nightly job');
  });
});

describe('adaptRequest — robustness', () => {
  it('never throws when any top-level key is missing', () => {
    for (const fixture of f.ALL_FIXTURES) {
      const keys = Object.keys(fixture.body as Record<string, unknown>);
      for (const key of keys) {
        const mutated = { ...(fixture.body as Record<string, unknown>) };
        delete mutated[key];
        expect(() => adaptRequest(req(fixture.headers, mutated)), `${fixture.name} without ${key}`).not.toThrow();
      }
      expect(() => adaptRequest(req(fixture.headers, null)), `${fixture.name} with null body`).not.toThrow();
      expect(() => adaptRequest(req(fixture.headers, 'a string')), `${fixture.name} with string body`).not.toThrow();
    }
  });

  it('produces output that always survives lenient validation', () => {
    for (const fixture of f.ALL_FIXTURES) {
      const outcome = adaptRequest(req(fixture.headers, fixture.body));
      if (!outcome || outcome.result?.kind !== 'event') continue;
      const result = validate(outcome.result.event, 'lenient');
      expect(result.ok, `${fixture.name} failed lenient validate`).toBe(true);
      expect(result.event!.title.length).toBeLessThanOrEqual(120);
      expect(result.event!.severity).toBeGreaterThanOrEqual(0);
      expect(result.event!.severity).toBeLessThanOrEqual(3);
    }
  });

  it('builds titles that redaction leaves intact', () => {
    for (const fixture of f.ALL_FIXTURES) {
      const outcome = adaptRequest(req(fixture.headers, fixture.body));
      if (!outcome || outcome.result?.kind !== 'event') continue;
      const { title } = outcome.result.event;
      expect(redact(title), `${fixture.name} title hit a redaction landmine`).toBe(title);
    }
  });
});
