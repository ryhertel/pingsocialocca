import type { PersistentState } from '@/lib/types';

export type IngestEventType = 'success' | 'error' | 'message' | 'thinking' | 'warning' | 'incident' | 'deploy';

export interface NormalizedEvent {
  id: string;
  source: string;
  eventType: IngestEventType;
  title: string;
  body?: string;
  tags?: string[];
  severity: number; // 0-3
  timestamp: number;
  receivedAt: number;
}

export interface ReactionOutput {
  eyeState: PersistentState;
  emotionType?: string;
  soundFn: string;
  overlayType?: string;
  pulseLevel?: number;
  notificationIcon?: 'dollar' | 'heart' | 'chat' | 'rocket';
}
