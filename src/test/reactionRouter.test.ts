import { describe, it, expect } from 'vitest';
import { routeEvent } from '@/lib/ingest/reactionRouter';
import type { NormalizedEvent, IngestEventType } from '@/lib/ingest/types';

function ev(
  partial: Partial<NormalizedEvent> & { title: string; eventType: IngestEventType },
): NormalizedEvent {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    source: 'test',
    severity: 1,
    timestamp: 1_700_000_000_000,
    receivedAt: 1_700_000_000_000,
    ...partial,
  };
}

describe('routeEvent — polarity', () => {
  it('an error event never celebrates, even when it mentions money', () => {
    const r = routeEvent(ev({ eventType: 'error', title: 'Payment failed' }));
    expect(r.eyeState).toBe('error');
    expect(r.soundFn).toBe('playError');
    expect(r.overlayType).not.toBe('coinRain');
    expect(r.emotionType).not.toBe('cheer');
  });

  it(`"unpaid" does not read as "paid"`, () => {
    const r = routeEvent(ev({ eventType: 'warning', title: 'Order unpaid' }));
    expect(r.soundFn).not.toBe('playKaChing');
    expect(r.overlayType).not.toBe('coinRain');
  });

  it('"wholesale" does not read as "sale"', () => {
    const r = routeEvent(ev({ eventType: 'message', title: 'Wholesale pricing updated' }));
    expect(r.soundFn).not.toBe('playKaChing');
  });

  it('an incident outranks an incidental chat word', () => {
    const r = routeEvent(ev({ eventType: 'incident', title: 'P0: chat service down' }));
    expect(r.soundFn).toBe('playSiren');
    expect(r.overlayType).toBe('shockwave');
  });
});

describe('routeEvent — word boundaries', () => {
  it('"1004" is not the milestone "100"', () => {
    const r = routeEvent(ev({ eventType: 'success', title: 'Synced 1004 contacts' }));
    expect(r.soundFn).not.toBe('playFanfare');
    expect(r.overlayType).not.toBe('starBurst');
  });

  it('"Admin" does not contain the message keyword "dm"', () => {
    const r = routeEvent(ev({ eventType: 'warning', title: 'Admin login from new device' }));
    expect(r.overlayType).not.toBe('sparkleTrail');
    expect(r.notificationIcon).not.toBe('chat');
  });

  it('"1500" is not the error keyword "500"', () => {
    const r = routeEvent(ev({ eventType: 'success', title: 'Cached 1500 assets' }));
    expect(r.eyeState).not.toBe('error');
  });

  it('"recharged" does not contain the money keyword "charge"', () => {
    const r = routeEvent(ev({ eventType: 'message', title: 'Battery recharged' }));
    expect(r.soundFn).not.toBe('playKaChing');
  });

  it('still matches "$" as a symbol needle', () => {
    const r = routeEvent(ev({ eventType: 'message', title: 'Refund of $12 issued' }));
    expect(r.soundFn).toBe('playKaChing');
    expect(r.notificationIcon).toBe('dollar');
  });

  it('still matches emoji needles', () => {
    const r = routeEvent(ev({ eventType: 'message', title: '🎉 launch day' }));
    expect(r.overlayType).toBe('balloonRise');
    expect(r.notificationIcon).toBe('party');
  });

  it('still matches a real money word at a boundary', () => {
    const r = routeEvent(ev({ eventType: 'success', title: 'New payment received' }));
    expect(r.soundFn).toBe('playKaChing');
  });
});

describe('routeEvent — severity', () => {
  it('severity 3 forces the urgent reaction regardless of keywords', () => {
    const r = routeEvent(ev({ eventType: 'message', title: 'Nightly digest ready', severity: 3 }));
    expect(r.soundFn).toBe('playSiren');
    expect(r.overlayType).toBe('shockwave');
    expect(r.notificationIcon).toBe('alert');
  });

  it('severity 0 drops the overlay but keeps the eye state', () => {
    const loud = routeEvent(ev({ eventType: 'deploy', title: 'Deployed to production' }));
    const quiet = routeEvent(ev({ eventType: 'deploy', title: 'Deployed to production', severity: 0 }));
    expect(loud.overlayType).toBeDefined();
    expect(quiet.overlayType).toBeUndefined();
    expect(quiet.eyeState).toBe(loud.eyeState);
  });

  it('pulseLevel mirrors severity on every output', () => {
    for (const severity of [0, 1, 2, 3]) {
      const r = routeEvent(ev({ eventType: 'message', title: 'Something happened', severity }));
      expect(r.pulseLevel).toBe(severity);
    }
  });
});

describe('routeEvent — purity and coverage', () => {
  it('is pure: same input yields a deep-equal output and does not mutate the input', () => {
    const input = ev({ eventType: 'success', title: 'New payment received', tags: ['billing'] });
    const snapshot = JSON.parse(JSON.stringify(input));
    const a = routeEvent(input);
    const b = routeEvent(input);
    expect(a).toEqual(b);
    expect(input).toEqual(snapshot);
  });

  it('falls back to the base map for an unmatched event', () => {
    const r = routeEvent(ev({ eventType: 'thinking', title: 'Working on it' }));
    expect(r.eyeState).toBe('thinking');
    expect(r.soundFn).toBe('playThinking');
  });

  it('matches keywords found in tags, not just the title', () => {
    const r = routeEvent(ev({ eventType: 'message', title: 'Nothing special', tags: ['invoice'] }));
    expect(r.soundFn).toBe('playKaChing');
  });
});
