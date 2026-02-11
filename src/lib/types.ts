export type PersistentState = 'disconnected' | 'idle' | 'thinking' | 'speaking' | 'error';
export type TransientReaction = 'success' | 'notify' | null;
export type ConnectionMode = 'demo' | 'bridge';
export type ThemePreset = 'mint' | 'sky' | 'berry' | 'honey';
export type AnimationIntensity = 'low' | 'medium' | 'high';
export type AutoLockMinutes = 5 | 15 | 30 | 60;

export interface DemoButton {
  label: string;
  action: string;
}

export interface DemoAction {
  type: 'triggerEyes' | 'triggerSound';
  payload: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  revealedText: string;
  isRevealing: boolean;
  ts: number;
  buttons?: DemoButton[];
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
}
