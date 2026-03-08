import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { startTextReveal } from './textReveal';
import { playReceive, playNotify, playConfirm, playExcited, playThinking, playMotif, triggerEmotion } from './audio';
import { routeInput } from './demoIntentRouter';
import { routeEvent } from './ingest/reactionRouter';
import { executeReaction } from './ingest/reactionExecutor';
import type { DemoButton, DemoAction } from './types';

interface DemoState {
  currentModule: 'idle' | 'welcome' | 'whatIsPing' | 'notifications' | 'integrations' | 'privacy';
  stepsCompleted: number;
  lastIntegration: string | null;
  sawNotificationDemo: boolean;
  turnsSinceCtaSurface: number;
}

interface ResponseNode {
  text: string;
  buttons: DemoButton[];
  demoActions?: DemoAction[];
  module?: DemoState['currentModule'];
}

let state: DemoState = {
  currentModule: 'idle',
  stepsCompleted: 0,
  lastIntegration: null,
  sawNotificationDemo: false,
  turnsSinceCtaSurface: 0,
};

let activeTimers: number[] = [];
let showcaseTimers: number[] = [];
let showcaseRunning = false;
let revealCleanups: (() => void)[] = [];

function clearAll() {
  activeTimers.forEach((t) => clearTimeout(t));
  activeTimers = [];
  revealCleanups.forEach((fn) => fn());
  revealCleanups = [];
}

function resetState() {
  state = {
    currentModule: 'idle',
    stepsCompleted: 0,
    lastIntegration: null,
    sawNotificationDemo: false,
    turnsSinceCtaSurface: 0,
  };
}

// ── Response Map ──

function getWelcomeResponse(): ResponseNode {
  return {
    text: "Hey 👀 I'm Ping. I turn AI agent activity into expressive eyes + notification moments. Want to see a quick demo?",
    buttons: [
      { label: 'Yes — show me', action: 'see_demo' },
      { label: 'Tell me what Ping does', action: 'whatIsPing' },
      { label: 'Connect OpenClaw', action: 'integrate_openclaw' },
    ],
    module: 'welcome',
  };
}

function getWhatIsPingResponse(): ResponseNode {
  return {
    text: "Ping visualizes AI agent activity as emotional feedback instead of logs. When your agent thinks, Ping's eyes shift. When it responds, they glow and you hear a sound. It's the emotional layer for your AI.",
    buttons: [
      { label: 'Notifications', action: 'notifications' },
      { label: 'Animations', action: 'animations' },
      { label: 'Integrations', action: 'integrations' },
      { label: 'Privacy', action: 'privacy' },
    ],
    demoActions: [{ type: 'triggerEyes', payload: 'idle' }],
    module: 'whatIsPing',
  };
}

function getNotificationsResponse(): ResponseNode {
  return {
    text: "Watch Ping's eyes react to a notification event right now. Each notification type — thinking, success, error, new message — maps to a unique eye state and sound.",
    buttons: [
      { label: 'Trigger another', action: 'notifications_again' },
      { label: 'Connect your agent', action: 'integrate_openclaw' },
      { label: 'Back to menu', action: 'whatIsPing' },
    ],
    demoActions: [
      { type: 'triggerSound', payload: 'notify' },
      { type: 'triggerEyes', payload: 'surprise' },
    ],
    module: 'notifications',
  };
}

function getNotificationsAgainResponse(): ResponseNode {
  const variants: ResponseNode[] = [
    {
      text: "Here's a success notification — the eyes glow and you hear a confirmation tone. This fires when your agent completes a task.",
      buttons: [
        { label: 'Trigger another', action: 'notifications_again' },
        { label: 'What is Ping?', action: 'whatIsPing' },
        { label: 'Connect your agent', action: 'integrate_openclaw' },
      ],
      demoActions: [
        { type: 'triggerSound', payload: 'confirm' },
        { type: 'triggerEyes', payload: 'happy' },
      ],
    },
    {
      text: "Now a thinking state — the eyes shift slowly. This shows when your agent is processing. Subtle, but it keeps you in the loop without checking logs.",
      buttons: [
        { label: 'Trigger another', action: 'notifications_again' },
        { label: 'Integrations', action: 'integrations' },
        { label: 'Connect your agent', action: 'integrate_openclaw' },
      ],
      demoActions: [{ type: 'triggerEyes', payload: 'thinking' }],
    },
    {
      text: "And here's how Ping reacts to a new message arriving — a quick receive tone with eye movement. Expressive, not noisy.",
      buttons: [
        { label: 'Trigger another', action: 'notifications_again' },
        { label: 'Privacy', action: 'privacy' },
        { label: 'Connect your agent', action: 'integrate_openclaw' },
      ],
      demoActions: [
        { type: 'triggerSound', payload: 'receive' },
        { type: 'triggerEyes', payload: 'curious' },
      ],
    },
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function getIntegrationsResponse(): ResponseNode {
  return {
    text: "Ping connects to your AI agents and external services. Which are you interested in?",
    buttons: [
      { label: 'OpenClaw (local)', action: 'integrate_openclaw' },
      { label: 'Webhooks', action: 'integrate_webhooks' },
      { label: 'Other', action: 'integrate_other' },
      { label: 'Just exploring', action: 'see_demo' },
    ],
    module: 'integrations',
  };
}

function getOpenClawResponse(): ResponseNode {
  return {
    text: "OpenClaw connection is local-only by default — no tokens stored in the browser. You run a small bridge on your computer, then Ping connects to it via WebSocket at ws://127.0.0.1:3939/ping.",
    buttons: [
      { label: 'Open setup steps', action: 'openclaw_setup' },
      { label: 'Back to menu', action: 'whatIsPing' },
      { label: 'Keep exploring', action: 'see_demo' },
    ],
    module: 'integrations',
  };
}

function getOpenClawSetupResponse(): ResponseNode {
  // Dispatch event to open the setup modal
  window.dispatchEvent(new CustomEvent('ping:openClawSetup'));
  return {
    text: "I've opened the setup guide for you. Follow the 3 steps to get your bridge running, then hit Connect. Keep the terminal open while using Ping.",
    buttons: [
      { label: 'Back to integrations', action: 'integrations' },
      { label: 'Keep exploring', action: 'see_demo' },
    ],
    module: 'integrations',
  };
}

function getWebhooksResponse(): ResponseNode {
  window.dispatchEvent(new CustomEvent('ping:openWebhookPanel'));
  return {
    text: "Webhooks let external services (Zapier, Make, GitHub, Stripe, your own scripts) send events to Ping. Each event triggers eye reactions, sounds, and overlays. I've opened the setup panel — you can also browse connector templates at /connectors.",
    buttons: [
      { label: 'Browse Connectors', action: 'open_connectors' },
      { label: 'Back to integrations', action: 'integrations' },
      { label: 'Keep exploring', action: 'see_demo' },
    ],
    module: 'integrations',
  };
}

function getOtherIntegrationResponse(): ResponseNode {
  return {
    text: "We're building more integrations. For now, OpenClaw is the primary local-first connection. Want to try it?",
    buttons: [
      { label: 'OpenClaw (local)', action: 'integrate_openclaw' },
      { label: 'Back to menu', action: 'whatIsPing' },
      { label: 'Keep exploring', action: 'see_demo' },
    ],
    module: 'integrations',
  };
}

function getPrivacyResponse(): ResponseNode {
  return {
    text: "Ping never stores tokens in the browser. OpenClaw runs locally on your machine. This demo is fully sandboxed — no data leaves your browser.",
    buttons: [
      { label: 'Back to demo', action: 'see_demo' },
      { label: 'Connect OpenClaw', action: 'integrate_openclaw' },
    ],
    demoActions: [{ type: 'triggerEyes', payload: 'idle' }],
    module: 'privacy',
  };
}

function getPricingResponse(): ResponseNode {
  return {
    text: "Ping is free to use. The demo runs entirely in your browser. OpenClaw bridge is open source and runs on your own machine.",
    buttons: [
      { label: 'Notifications', action: 'notifications' },
      { label: 'Integrations', action: 'integrations' },
      { label: 'Connect OpenClaw', action: 'integrate_openclaw' },
    ],
    module: 'whatIsPing',
  };
}

function getFallbackResponse(): ResponseNode {
  return {
    text: "I'm in Demo Mode (scripted), but I can show you the experience. What would you like to explore?",
    buttons: [
      { label: 'Notifications', action: 'notifications' },
      { label: 'Integrations', action: 'integrations' },
      { label: 'Privacy', action: 'privacy' },
    ],
  };
}

function getSeeDemoResponse(): ResponseNode {
  return {
    text: "Let's explore! Ping reacts to agent events with expressive eyes and sounds. Try triggering a notification, or learn more about integrations.",
    buttons: [
      { label: 'Notifications', action: 'notifications' },
      { label: 'Animations', action: 'animations' },
      { label: 'What is Ping?', action: 'whatIsPing' },
      { label: 'Integrations', action: 'integrations' },
    ],
    demoActions: [{ type: 'triggerEyes', payload: 'idle' }],
    module: 'welcome',
  };
}

function getTroubleshootingResponse(): ResponseNode {
  return {
    text: "If you see 'address already in use', an old bridge is running — stop it and retry. Bridge mode works best on desktop. On phones, 127.0.0.1 refers to the phone itself.",
    buttons: [
      { label: 'Open setup steps', action: 'openclaw_setup' },
      { label: 'Back to menu', action: 'whatIsPing' },
      { label: 'Connect OpenClaw', action: 'integrate_openclaw' },
    ],
    module: 'integrations',
  };
}

// ── Animations Menu ──

function getAnimationsResponse(): ResponseNode {
  return {
    text: "Ping has 6 idle animations that play randomly when it's bored. Try them out! Each one has unique eye movements and particle effects.",
    buttons: [
      { label: '🎆 Fireworks', action: 'spectacle_fireworks' },
      { label: '🙄 Eye Roll', action: 'spectacle_eyeRoll' },
      { label: '✨ Sparkle Trail', action: 'spectacle_sparkleTrail' },
      { label: '⬇️ Gravity Drop', action: 'spectacle_gravityDrop' },
      { label: '😵 Dizzy Spin', action: 'spectacle_dizzySpin' },
      { label: '💫 Pulse Wave', action: 'spectacle_pulseWave' },
    ],
  };
}

function getSpectacleTriggeredResponse(name: string): ResponseNode {
  const labels: Record<string, string> = {
    fireworks: '🎆 Fireworks',
    eyeRoll: '🙄 Eye Roll',
    sparkleTrail: '✨ Sparkle Trail',
    gravityDrop: '⬇️ Gravity Drop',
    dizzySpin: '😵 Dizzy Spin',
    pulseWave: '💫 Pulse Wave',
  };
  return {
    text: `Playing ${labels[name] || name}! Watch Ping's eyes react.`,
    buttons: [
      { label: 'Try another', action: 'animations' },
      { label: 'Back to menu', action: 'see_demo' },
    ],
    demoActions: [{ type: 'triggerSpectacle', payload: name }],
  };
}

// ── Demo Effect Helpers ──

const DEMO_EFFECTS: Record<string, { title: string; keywords: string }> = {
  milestone:  { title: '🎯 Milestone reached!', keywords: 'milestone achieved goal' },
  party:      { title: '🎉 Party time!', keywords: 'party celebrate woohoo' },
  money:      { title: '💰 Ka-ching!', keywords: 'payment sale money' },
  love:       { title: '❤️ Feeling the love!', keywords: 'thanks love awesome' },
  alert:      { title: '🚨 Urgent alert!', keywords: 'urgent critical p0' },
  deploy:     { title: '🚀 Shipped!', keywords: 'deploy shipped released' },
  subscriber: { title: '👤 New subscriber!', keywords: 'subscriber signup new user' },
  message:    { title: '💬 New message!', keywords: 'message comment reply' },
  error:      { title: '❌ Error detected!', keywords: 'failed exception crash' },
  fireworks:  { title: '🎆 Fireworks!', keywords: 'deploy shipped' },
};

function triggerDemoEffect(name: string) {
  const effect = DEMO_EFFECTS[name];
  if (!effect) return;
  const reaction = routeEvent({
    id: crypto.randomUUID(),
    source: 'demo',
    eventType: 'message',
    title: effect.title,
    body: effect.keywords,
    severity: 1,
    timestamp: Date.now(),
    receivedAt: Date.now(),
  });
  executeReaction(reaction);
}

function getDemoEffectResponse(name: string): ResponseNode {
  const others = Object.keys(DEMO_EFFECTS).filter(k => k !== name).slice(0, 3);
  return {
    text: `Triggered **${name}** effect! ✨\n\nTry others: \`/demo ${others.join('`, `/demo ')}\``,
    buttons: [
      { label: '🎉 Party', action: 'demo_party' },
      { label: '🎯 Milestone', action: 'demo_milestone' },
      { label: '💰 Money', action: 'demo_money' },
      { label: '🚨 Alert', action: 'demo_alert' },
    ],
    module: state.currentModule,
  };
}

// ── Action Router ──

const ACTION_MAP: Record<string, () => ResponseNode> = {
  see_demo: getSeeDemoResponse,
  whatIsPing: getWhatIsPingResponse,
  notifications: getNotificationsResponse,
  notifications_again: getNotificationsAgainResponse,
  integrations: getIntegrationsResponse,
  integrate_openclaw: getOpenClawResponse,
  openclaw_setup: getOpenClawSetupResponse,
  integrate_discord: getWebhooksResponse,
  integrate_webhooks: getWebhooksResponse,
  open_connectors: () => {
    window.location.href = '/connectors';
    return {
      text: "Opening the Connectors page — you'll find setup templates for Generic, Stripe, and GitHub webhooks there.",
      buttons: [
        { label: 'Back to menu', action: 'whatIsPing' },
      ],
      module: 'integrations' as const,
    };
  },
  integrate_other: getOtherIntegrationResponse,
  privacy: getPrivacyResponse,
  pricing: getPricingResponse,
  troubleshooting: getTroubleshootingResponse,
  animations: getAnimationsResponse,
  spectacle_fireworks: () => getSpectacleTriggeredResponse('fireworks'),
  spectacle_eyeRoll: () => getSpectacleTriggeredResponse('eyeRoll'),
  spectacle_sparkleTrail: () => getSpectacleTriggeredResponse('sparkleTrail'),
  spectacle_gravityDrop: () => getSpectacleTriggeredResponse('gravityDrop'),
  spectacle_dizzySpin: () => getSpectacleTriggeredResponse('dizzySpin'),
  spectacle_pulseWave: () => getSpectacleTriggeredResponse('pulseWave'),
  connect_bridge: () => {
    window.dispatchEvent(new CustomEvent('ping:openClawSetup'));
    return {
      text: "I've opened the connection setup. Make sure your bridge is running, then click Connect in the modal.",
      buttons: [
        { label: 'Back to menu', action: 'whatIsPing' },
        { label: 'Keep exploring', action: 'see_demo' },
      ],
      module: 'integrations' as const,
    };
  },
  // Demo effect trigger buttons
  demo_milestone: () => { triggerDemoEffect('milestone'); return getDemoEffectResponse('milestone'); },
  demo_party: () => { triggerDemoEffect('party'); return getDemoEffectResponse('party'); },
  demo_money: () => { triggerDemoEffect('money'); return getDemoEffectResponse('money'); },
  demo_love: () => { triggerDemoEffect('love'); return getDemoEffectResponse('love'); },
  demo_alert: () => { triggerDemoEffect('alert'); return getDemoEffectResponse('alert'); },
  demo_deploy: () => { triggerDemoEffect('deploy'); return getDemoEffectResponse('deploy'); },
  demo_subscriber: () => { triggerDemoEffect('subscriber'); return getDemoEffectResponse('subscriber'); },
  demo_error: () => { triggerDemoEffect('error'); return getDemoEffectResponse('error'); },
  demo_all: () => {
    handleDemoInput('/demo all');
    return { text: '', buttons: [], module: state.currentModule };
  },
  demo_stop: () => {
    handleDemoInput('/demo stop');
    return { text: '', buttons: [], module: state.currentModule };
  },
};

function resolveAction(action: string): ResponseNode {
  const handler = ACTION_MAP[action];
  return handler ? handler() : getFallbackResponse();
}

function resolveInput(text: string): ResponseNode {
  const lower = text.toLowerCase().trim();

  // Check exact button label matches first
  const labelMap: Record<string, string> = {
    'yes': 'see_demo',
    'no': 'whatIsPing',
    'discord': 'integrate_webhooks',
    'openclaw': 'integrate_openclaw',
    'privacy': 'privacy',
    'price': 'pricing',
    'notifications': 'notifications',
    'integrations': 'integrations',
    'help': 'troubleshooting',
  };
  for (const [keyword, action] of Object.entries(labelMap)) {
    if (lower === keyword || lower === keyword + '?') {
      return resolveAction(action);
    }
  }

  // Use intent router
  const { intent, topic } = routeInput(text);

  // Topic takes priority if matched
  if (topic) {
    const topicActionMap: Record<string, string> = {
      openclaw: 'integrate_openclaw',
      webhooks: 'integrate_webhooks',
      connectors: 'open_connectors',
      discord: 'integrate_webhooks',
      notifications: 'notifications',
      sound: 'notifications',
      eyes: 'notifications',
      privacy: 'privacy',
      animations: 'animations',
    };
    if (topicActionMap[topic]) return resolveAction(topicActionMap[topic]);
  }

  // Fall back to intent
  const intentActionMap: Record<string, string> = {
    learn: 'whatIsPing',
    see_demo: 'see_demo',
    integrate: 'integrations',
    pricing: 'pricing',
    security: 'privacy',
    troubleshooting: 'troubleshooting',
  };
  if (intent !== 'unknown' && intentActionMap[intent]) {
    return resolveAction(intentActionMap[intent]);
  }

  return getFallbackResponse();
}

// ── Execute Demo Actions ──

function executeDemoActions(actions?: DemoAction[]) {
  if (!actions) return;
  const store = usePingStore.getState();
  const settings = useSettingsStore.getState();

  for (const action of actions) {
    if (action.type === 'triggerEyes') {
      const validStates = ['idle', 'thinking', 'speaking', 'error'] as const;
      const s = action.payload as typeof validStates[number];
      if (validStates.includes(s)) {
        store.setPersistentState(s);
      }
      // Also trigger emotional states via custom event
      const emotionStates = ['happy', 'laugh', 'shock', 'curious', 'concern', 'proud', 'surprise', 'cheer'];
      if (emotionStates.includes(action.payload)) {
        triggerEmotion(action.payload, 2000);
      }
    } else if (action.type === 'triggerSound') {
      if (action.payload === 'notify') {
        playNotify(settings.volume, settings.muted, settings.dnd);
        store.triggerReaction('notify');
      } else if (action.payload === 'confirm') {
        playConfirm(settings.volume, settings.muted, settings.dnd);
        store.triggerReaction('success');
      } else if (action.payload === 'receive') {
        playReceive(settings.volume, settings.muted, settings.dnd);
      } else if (action.payload === 'excited') {
        playExcited(settings.volume, settings.muted, settings.dnd);
      } else if (action.payload === 'thinking') {
        playThinking(settings.volume, settings.muted, settings.dnd);
      } else if (action.payload === 'motif') {
        playMotif(settings.volume, settings.muted, settings.dnd);
      }
    } else if (action.type === 'triggerSpectacle') {
      window.dispatchEvent(new CustomEvent('ping:triggerSpectacle', { detail: action.payload }));
    }
  }
}

// ── Deliver Response ──

function deliverResponse(node: ResponseNode) {
  const store = usePingStore.getState();
  const settings = useSettingsStore.getState();

  // Maybe append CTA every 2-3 turns
  state.turnsSinceCtaSurface++;
  state.stepsCompleted++;
  let buttons = [...node.buttons];
  if (state.turnsSinceCtaSurface >= 3) {
    state.turnsSinceCtaSurface = 0;
    const hasConnect = buttons.some(
      (b) => b.action === 'integrate_openclaw' || b.action === 'connect_bridge'
    );
    if (!hasConnect) {
      buttons.push({ label: 'Connect your agent', action: 'integrate_openclaw' });
    }
  }

  if (node.module) state.currentModule = node.module;

  if (node.demoActions?.some((a) => a.payload === 'notifications')) {
    state.sawNotificationDemo = true;
  }

  const msg = {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    text: node.text,
    revealedText: '',
    isRevealing: true,
    ts: Date.now(),
    buttons,
  };

  store.addMessage(msg);
  store.setPersistentState('speaking');
  playReceive(settings.volume, settings.muted, settings.dnd);

  const cleanup = startTextReveal(
    msg.id,
    node.text,
    settings.animationIntensity,
    (id, revealed) => usePingStore.getState().updateMessageReveal(id, revealed),
    () => {
      usePingStore.getState().finishReveal(msg.id);
      const t = window.setTimeout(() => {
        if (usePingStore.getState().persistentState === 'speaking') {
          usePingStore.getState().setPersistentState('idle');
        }
      }, 1000);
      activeTimers.push(t);
    },
  );
  revealCleanups.push(cleanup);

  // Execute demo actions after a short delay
  if (node.demoActions && node.demoActions.length > 0) {
    const t = window.setTimeout(() => {
      executeDemoActions(node.demoActions);
    }, 800);
    activeTimers.push(t);
  }
}

// ── Public API ──

export function startScriptedDemo() {
  clearAll();
  resetState();
  const store = usePingStore.getState();
  store.setPersistentState('idle');
  store.clearMessages();

  // Play signature motif on demo start
  const settings = useSettingsStore.getState();
  playMotif(settings.volume, settings.muted, settings.dnd);

  // Auto-send welcome after a short delay
  const t = window.setTimeout(() => {
    deliverResponse(getWelcomeResponse());
  }, 800);
  activeTimers.push(t);
}

export function stopScriptedDemo() {
  clearAll();
}

export function handleDemoInput(text: string) {
  const store = usePingStore.getState();
  const trimmed = text.trim();

  // /demo <effect> command — trigger reaction effects directly
  const demoMatch = trimmed.match(/^\/demo\s+(.+)$/i);
  if (demoMatch) {
    const effectName = demoMatch[1].trim().toLowerCase();

    // /demo stop — cancel showcase reel
    if (effectName === 'stop') {
      if (showcaseRunning) {
        showcaseTimers.forEach((t) => clearTimeout(t));
        showcaseTimers = [];
        showcaseRunning = false;
        deliverResponse({
          text: `⏹️ **Showcase stopped.** Try any effect individually with \`/demo <name>\` or restart with \`/demo all\`.`,
          buttons: [
            { label: '🔁 Replay all', action: 'demo_all' },
            { label: '🎉 Party', action: 'demo_party' },
            { label: '🎯 Milestone', action: 'demo_milestone' },
          ],
          module: state.currentModule,
        });
      } else {
        deliverResponse({
          text: `No showcase is currently running. Start one with \`/demo all\`.`,
          buttons: [{ label: '▶️ Start showcase', action: 'demo_all' }],
          module: state.currentModule,
        });
      }
      return;
    }

    // /demo all — showcase reel cycling through every effect
    if (effectName === 'all') {
      // Cancel any existing showcase first
      showcaseTimers.forEach((t) => clearTimeout(t));
      showcaseTimers = [];
      showcaseRunning = true;

      const effectNames = Object.keys(DEMO_EFFECTS);
      const INTERVAL = 3000;
      deliverResponse({
        text: `🎬 **Showcase reel starting!** Cycling through all ${effectNames.length} effects… Type \`/demo stop\` to cancel.`,
        buttons: [{ label: '⏹️ Stop', action: 'demo_stop' }],
        module: state.currentModule,
      });
      effectNames.forEach((name, i) => {
        const t = window.setTimeout(() => {
          if (!showcaseRunning) return;
          triggerDemoEffect(name);
          const store = usePingStore.getState();
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            text: `${DEMO_EFFECTS[name].title}  (**${i + 1}/${effectNames.length}**)`,
            revealedText: `${DEMO_EFFECTS[name].title}  (**${i + 1}/${effectNames.length}**)`,
            isRevealing: false,
            ts: Date.now(),
          });
          // After last effect, show completion message
          if (i === effectNames.length - 1) {
            const t2 = window.setTimeout(() => {
              showcaseRunning = false;
              deliverResponse({
                text: `🎬 **Showcase complete!** That was all ${effectNames.length} effects. Try any individually with \`/demo <name>\`.`,
                buttons: [
                  { label: '🔁 Replay all', action: 'demo_all' },
                  { label: '🎉 Party', action: 'demo_party' },
                  { label: '🎯 Milestone', action: 'demo_milestone' },
                  { label: '💰 Money', action: 'demo_money' },
                ],
                module: state.currentModule,
              });
            }, INTERVAL);
            showcaseTimers.push(t2);
          }
        }, (i + 1) * INTERVAL);
        showcaseTimers.push(t);
      });
      return;
    }

    if (DEMO_EFFECTS[effectName]) {
      triggerDemoEffect(effectName);
      deliverResponse(getDemoEffectResponse(effectName));
      return;
    } else {
      const availableEffects = Object.keys(DEMO_EFFECTS).join(', ');
      deliverResponse({
        text: `Unknown effect **"${effectName}"**. Available: ${availableEffects}, all`,
        buttons: [
          { label: '🎉 Party', action: 'demo_party' },
          { label: '🎯 Milestone', action: 'demo_milestone' },
          { label: '❤️ Love', action: 'demo_love' },
        ],
        module: state.currentModule,
      });
      return;
    }
  }

  store.setPersistentState('thinking');

  const node = resolveInput(text);
  const delay = 1000 + Math.random() * 1500;
  const t = window.setTimeout(() => {
    deliverResponse(node);
  }, delay);
  activeTimers.push(t);
}

export function handleDemoButtonClick(action: string) {
  const store = usePingStore.getState();
  store.setPersistentState('thinking');

  const node = resolveAction(action);
  const delay = 800 + Math.random() * 1000;
  const t = window.setTimeout(() => {
    deliverResponse(node);
  }, delay);
  activeTimers.push(t);
}
