import type { IngestEventType } from '@/lib/ingest/types';

export interface ConnectorTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
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
