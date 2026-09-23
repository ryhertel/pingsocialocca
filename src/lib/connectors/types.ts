import type { IngestEventType } from '@/lib/ingest/types';

/**
 * How a source reaches Ping. This is the honest axis, and it drives the copy —
 * the old templates implied every connector was equally easy, which sent people
 * to Zapier for sources that now work directly.
 */
export type ConnectorTransport =
  /** Point the provider's webhook straight at Ping. A server-side adapter maps the payload. */
  | 'direct'
  /** Anything that can POST JSON: curl, a script, CI, Zapier, Make, n8n. */
  | 'generic'
  /** Needs an app, bot or relay in between — not a URL you can paste. */
  | 'middleware'
  /** A local WebSocket bridge rather than HTTP. */
  | 'bridge';

export interface ConnectorTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  transport: ConnectorTransport;
  /** Matches an adapter id in supabase/functions/ingest/adapters.ts, when one exists. */
  adapterId?: string;
  setupSteps: string[];
  testEvent: {
    source: string;
    eventType: IngestEventType;
    title: string;
    body?: string;
  };
  keywordsSupported: string[];
  notes: string;
  securityCopy: string;
}
