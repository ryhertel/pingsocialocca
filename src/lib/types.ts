export type PersistentState = 'disconnected' | 'idle' | 'thinking' | 'speaking' | 'error';
export type TransientReaction = 'success' | 'notify' | null;
export type ConnectionMode = 'demo' | 'bridge';
export type ThemePreset = 'mint' | 'sky' | 'berry' | 'honey';
export type AnimationIntensity = 'low' | 'medium' | 'high';
export type AutoLockMinutes = 5 | 15 | 30 | 60;
export type ChatLayout = 'bubbles' | 'docked';

export interface DemoButton {
  label: string;
  action: string;
}

export interface DemoAction {
  type: 'triggerEyes' | 'triggerSound' | 'triggerSpectacle';
  payload: string;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataBase64: string;
  /** Local blob URL for preview (images only) */
  blobUrl?: string;
}

export interface AttachmentSummary {
  id: string;
  name: string;
  kind: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  revealedText: string;
  isRevealing: boolean;
  ts: number;
  buttons?: DemoButton[];
  attachments?: Attachment[];
  attachmentSummaries?: AttachmentSummary[];
}

export interface BridgeCapabilities {
  attachments: boolean;
  maxAttachmentBytes: number;
  maxAttachmentsPerMessage: number;
  supportedMimes: string[];
}

export interface DiagnosticsEntry {
  ts: number;
  type: string;
  payload?: unknown;
}

export interface BridgeStatus {
  connected: boolean;
  agentId?: string;
  agentName?: string;
  protocolVersion?: string;
  capabilities?: BridgeCapabilities;
}

// Attachment constants (defaults when bridge doesn't report capabilities)
export const ATTACHMENT_DEFAULTS: BridgeCapabilities = {
  attachments: true,
  maxAttachmentBytes: 10 * 1024 * 1024, // 10MB
  maxAttachmentsPerMessage: 5,
  supportedMimes: [
    'image/png', 'image/jpeg', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
  ],
};
