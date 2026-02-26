import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { startTextReveal } from './textReveal';
import { playError, playReceive } from './audio';
import type { ChatMessage, Attachment, BridgeCapabilities } from './types';

let ws: WebSocket | null = null;
let heartbeatTimer: number | null = null;
let reconnectTimer: number | null = null;
let revealCleanups: (() => void)[] = [];
let idleTimer: number | null = null;

export function connectBridge(url: string) {
  disconnectBridge();

  try {
    ws = new WebSocket(url);
  } catch {
    usePingStore.getState().setPersistentState('error');
    usePingStore.getState().setLastError('Failed to create WebSocket connection');
    return;
  }

  ws.onopen = () => {
    usePingStore.getState().setBridgeStatus({ connected: true });
    usePingStore.getState().setPersistentState('idle');
    startHeartbeat();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleEvent(data);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    usePingStore.getState().setBridgeStatus({ connected: false, capabilities: undefined });
    usePingStore.getState().setPersistentState('disconnected');
    stopHeartbeat();
    if (useSettingsStore.getState().connectionMode === 'bridge') {
      reconnectTimer = window.setTimeout(() => connectBridge(url), 3000);
    }
  };

  ws.onerror = () => {};
}

function handleEvent(data: Record<string, unknown>) {
  const store = usePingStore.getState();
  store.updateLastEventTs();
  const type = data.type as string;

  switch (type) {
    case 'status':
    case 'bridge_status': {
      const statusUpdate: Partial<ReturnType<typeof usePingStore.getState>['bridgeStatus']> = {
        connected: (data.connected as boolean) ?? true,
        agentId: data.agentId as string | undefined,
        agentName: data.agentName as string | undefined,
        protocolVersion: (data.version as string) ?? (data.protocolVersion as string | undefined),
      };
      // Parse capabilities if present
      if (data.capabilities) {
        statusUpdate.capabilities = data.capabilities as BridgeCapabilities;
      }
      store.setBridgeStatus(statusUpdate);
      break;
    }

    case 'ack':
      // Bridge acknowledged receipt — no UI action needed
      break;

    case 'message':
    case 'assistant_message': {
      const isAssistantMsg = type === 'assistant_message';
      const text = (isAssistantMsg ? data.message : data.text) as string;
      const role = isAssistantMsg ? 'assistant' : (data.role as 'user' | 'assistant');
      const msg: ChatMessage = {
        id: (data.id as string) || crypto.randomUUID(),
        role,
        text,
        revealedText: role === 'user' ? text : '',
        isRevealing: role === 'assistant',
        ts: (data.ts as number) || Date.now(),
        attachmentSummaries: data.attachmentSummaries as ChatMessage['attachmentSummaries'],
      };
      store.addMessage(msg);

      if (role === 'assistant') {
        store.setPersistentState('speaking');
        resetIdleTimer();
        const settings = useSettingsStore.getState();
        playReceive(settings.volume, settings.muted, settings.dnd);
        const cleanup = startTextReveal(
          msg.id,
          msg.text,
          settings.animationIntensity,
          (id, revealed) => usePingStore.getState().updateMessageReveal(id, revealed),
          () => {
            usePingStore.getState().finishReveal(msg.id);
            setIdleAfterDelay();
          },
        );
        revealCleanups.push(cleanup);
      }
      break;
    }

    case 'state':
      store.setPersistentState(data.state as 'idle' | 'thinking' | 'speaking' | 'error');
      break;

    case 'error':
      store.setPersistentState('error');
      store.setLastError(data.message as string);
      const s = useSettingsStore.getState();
      playError(s.volume, s.muted, s.dnd);
      break;

    default:
      // Unknown event — log to diagnostics, don't crash
      store.addDiagnosticsEntry({
        ts: Date.now(),
        type: `unknown:${type}`,
        payload: data,
      });
      break;
  }
}

function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function setIdleAfterDelay() {
  resetIdleTimer();
  idleTimer = window.setTimeout(() => {
    if (usePingStore.getState().persistentState === 'speaking') {
      usePingStore.getState().setPersistentState('idle');
    }
  }, 1500);
}

function startHeartbeat() {
  heartbeatTimer = window.setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function disconnectBridge() {
  stopHeartbeat();
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  revealCleanups.forEach((fn) => fn());
  revealCleanups = [];
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  // Force-reset store so UI reflects disconnected state immediately
  usePingStore.getState().setBridgeStatus({ connected: false, capabilities: undefined, agentId: undefined, agentName: undefined, protocolVersion: undefined });
  usePingStore.getState().setPersistentState('disconnected');
}

export function sendMessage(text: string, attachments?: Attachment[]) {
  if (ws?.readyState === WebSocket.OPEN) {
    const payload: Record<string, unknown> = {
      type: 'user_message',
      id: crypto.randomUUID(),
      text,
      context: {
        source: 'ping-ui',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        size: a.size,
        dataBase64: a.dataBase64,
      }));
    }
    ws.send(JSON.stringify(payload));
  }
}

export function setAgent(agentId: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'setAgent', agentId }));
  }
}
