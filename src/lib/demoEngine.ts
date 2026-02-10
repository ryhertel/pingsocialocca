import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { startTextReveal } from './textReveal';
import { playNotify, playConfirm, playReceive } from './audio';

const DEMO_MESSAGES = [
  "I've analyzed the incoming data streams and found some interesting patterns worth investigating further.",
  "System health check complete. All core processes are running within optimal parameters across the board.",
  "I've prepared a summary of the latest activity logs. Would you like me to walk through the key findings?",
  "The neural processing pipeline has been optimized. Response latency reduced by approximately twelve percent.",
  "I noticed an unusual spike in network traffic around fourteen hundred hours. Monitoring closely for anomalies.",
  "Configuration update applied successfully. All modules are now synchronized with the latest parameters.",
  "I've been thinking about the workflow optimization you mentioned earlier. I have a few suggestions ready when you are.",
  "The automated backup completed without issues. All critical data has been securely archived and verified.",
  "Interesting development — the pattern recognition module identified a previously unknown correlation in the dataset.",
  "Running a diagnostic sweep of all connected subsystems. Initial results look nominal across all channels.",
  "I've compiled the resource utilization report for the past cycle. Efficiency metrics are trending upward overall.",
  "A minor adjustment to the scheduling algorithm has improved task throughput by roughly eight percent overall.",
  "The security scan completed with no vulnerabilities detected. Perimeter integrity is maintained and stable.",
  "I'm ready to assist with the next phase of the project whenever you would like to proceed.",
  "Environmental conditions are stable. All sensors reporting within expected ranges and calibration is current.",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

let activeTimers: number[] = [];
let revealCleanups: (() => void)[] = [];

function clearAll() {
  activeTimers.forEach((t) => clearTimeout(t));
  activeTimers = [];
  revealCleanups.forEach((fn) => fn());
  revealCleanups = [];
}

function generateResponse() {
  const store = usePingStore.getState();
  const settings = useSettingsStore.getState();
  if (settings.connectionMode !== 'demo') return;

  const text = DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];
  const msg = {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    text,
    revealedText: '',
    isRevealing: true,
    ts: Date.now(),
  };

  store.addMessage(msg);
  store.setPersistentState('speaking');
  const s2 = useSettingsStore.getState();
  playReceive(s2.volume, s2.muted, s2.dnd);

  const cleanup = startTextReveal(
    msg.id,
    text,
    settings.animationIntensity,
    (id, revealed) => usePingStore.getState().updateMessageReveal(id, revealed),
    () => {
      usePingStore.getState().finishReveal(msg.id);
      const t = window.setTimeout(() => {
        if (usePingStore.getState().persistentState === 'speaking') {
          usePingStore.getState().setPersistentState('idle');
        }
      }, 1500);
      activeTimers.push(t);
    },
  );
  revealCleanups.push(cleanup);

  // 15% chance: trigger success reaction
  if (Math.random() < 0.15) {
    const t = window.setTimeout(() => {
      usePingStore.getState().triggerReaction('success');
      const s = useSettingsStore.getState();
      playConfirm(s.volume, s.muted, s.dnd);
    }, 3000);
    activeTimers.push(t);
  }

  // 10% chance: trigger notify
  if (Math.random() < 0.1) {
    const t = window.setTimeout(() => {
      usePingStore.getState().triggerReaction('notify');
      const s = useSettingsStore.getState();
      playNotify(s.volume, s.muted, s.dnd);
    }, rand(2000, 5000));
    activeTimers.push(t);
  }
}

function scheduleAutonomous() {
  const delay = rand(10000, 40000);
  const t = window.setTimeout(() => {
    if (useSettingsStore.getState().connectionMode !== 'demo') return;

    usePingStore.getState().setPersistentState('thinking');

    const thinkDelay = rand(1500, 3500);
    const t2 = window.setTimeout(() => {
      generateResponse();
      scheduleAutonomous();
    }, thinkDelay);
    activeTimers.push(t2);
  }, delay);
  activeTimers.push(t);
}

export function startDemo() {
  clearAll();
  usePingStore.getState().setPersistentState('idle');
  usePingStore.getState().clearMessages();
  scheduleAutonomous();
}

export function stopDemo() {
  clearAll();
}

export function triggerDemoResponse() {
  const thinkDelay = rand(1500, 3500);
  const t = window.setTimeout(() => {
    generateResponse();
  }, thinkDelay);
  activeTimers.push(t);
}
