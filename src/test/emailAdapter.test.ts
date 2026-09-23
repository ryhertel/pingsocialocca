import { describe, it, expect } from 'vitest';
import { adaptRequest } from '../../supabase/functions/ingest/adapters.ts';
import type { RawRequest } from '../../supabase/functions/ingest/adapters.ts';
import { validate } from '../../supabase/functions/ingest/validate.ts';
import { redact } from '../../supabase/functions/ingest/redact.ts';

function emailReq(body: unknown): RawRequest {
  return { headers: {}, query: { source: 'email' }, body };
}

function eventOf(outcome: ReturnType<typeof adaptRequest>) {
  expect(outcome).not.toBeNull();
  expect(outcome!.result?.kind).toBe('event');
  if (outcome!.result?.kind !== 'event') throw new Error('not an event');
  return outcome!.result.event;
}

describe('emailAdapter — the happy path', () => {
  it('uses the subject as the title and the body as the body', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'billing@stripe.com',
      subject: 'Invoice #204 paid',
      text: 'Your invoice has been paid in full.',
      messageId: '<abc@stripe.com>',
    })));
    expect(e.source).toBe('email');
    expect(e.title).toBe('Invoice #204 paid');
    expect(e.body).toBe('Your invoice has been paid in full.');
    expect(e.dedupeKey).toBe('<abc@stripe.com>');
  });

  it('tags the sender domain so you can filter on it', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'Alerts <alerts@sentry.io>',
      subject: 'New issue',
      text: 'Something broke.',
    })));
    expect(e.tags).toContain('email');
    expect(e.tags).toContain('sentry.io');
  });

  it('routes through the normal keyword reaction, so "paid" still celebrates', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Invoice #204 paid',
      text: 'thanks',
    })));
    // The router reads the title; this asserts the adapter leaves it readable.
    expect(e.title.toLowerCase()).toContain('paid');
  });
});

describe('emailAdapter — messy real email', () => {
  it('stops at a quoted reply instead of quoting it back', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Re: deploy',
      text: 'Shipped it.\n\nOn Tue, Sep 22 2026, Bob wrote:\n> are we shipping today?\n> please advise',
    })));
    expect(e.body).toBe('Shipped it.');
    expect(e.body).not.toContain('are we shipping');
  });

  it('stops at a signature delimiter', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Status',
      text: 'All good.\n-- \nBob Smith\nCEO, Example Inc\n555-1234',
    })));
    expect(e.body).toBe('All good.');
    expect(e.body).not.toContain('Bob Smith');
  });

  it('skips boilerplate that would otherwise become the body', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Backup complete',
      text: 'Sent from my iPhone\n\nBackup finished in 4m12s',
    })));
    expect(e.body).toBe('Backup finished in 4m12s');
  });

  it('joins a hard-wrapped sentence back together', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Report',
      text: 'The nightly job processed\n1204 records without error.',
    })));
    expect(e.body).toBe('The nightly job processed 1204 records without error.');
  });

  it('falls back to the body when there is no subject', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: '',
      text: 'Server disk is at 91%',
    })));
    expect(e.title).toBe('Server disk is at 91%');
  });

  it('does not repeat the subject as the body', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Deploy finished',
      text: 'Deploy finished',
    })));
    expect(e.body).toBeUndefined();
  });

  it('ignores a message with nothing usable rather than storing an empty event', () => {
    const outcome = adaptRequest(emailReq({ from: 'a@b.com', subject: '', text: '   \n\n> quoted only' }));
    expect(outcome!.result?.kind).toBe('ignore');
  });
});

describe('emailAdapter — safety', () => {
  it('is only reachable through the explicit source override, never by sniffing', () => {
    const looksLikeEmail = { from: 'a@b.com', subject: 'Hello', text: 'hi' };
    const outcome = adaptRequest({ headers: {}, query: {}, body: looksLikeEmail });
    // The generic adapter may claim it on `subject`, but never the email adapter.
    expect(outcome?.id).not.toBe('email');
  });

  it('never throws on a malformed body', () => {
    for (const body of [null, 'a string', 42, [], { text: 123 }, { subject: {} }]) {
      expect(() => adaptRequest(emailReq(body)), JSON.stringify(body)).not.toThrow();
    }
  });

  it('produces output that survives lenient validation', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'x'.repeat(400),
      text: 'word '.repeat(500),
    })));
    const result = validate(e, 'lenient');
    expect(result.ok).toBe(true);
    expect(result.event!.title.length).toBeLessThanOrEqual(120);
  });

  it('redacts a URL in the body rather than storing it', () => {
    const e = eventOf(adaptRequest(emailReq({
      from: 'a@b.com',
      subject: 'Reset your password',
      text: 'Click https://example.com/reset?token=abc123def456ghi789 to continue',
    })));
    expect(redact(e.body!)).toContain('[link]');
  });
});
