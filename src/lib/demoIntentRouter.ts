const INTENT_KEYWORDS: Record<string, string[]> = {
  learn: ['what', 'how', 'explain', 'tell', 'about', 'info', 'does'],
  see_demo: ['demo', 'show', 'try', 'see', 'yes', 'cool', 'sure', 'ok', 'yeah', 'yep'],
  integrate: ['connect', 'setup', 'openclaw', 'discord', 'bridge', 'agent', 'integrate'],
  pricing: ['price', 'cost', 'free', 'pay', 'pricing'],
  security: ['security', 'privacy', 'safe', 'token', 'local', 'data', 'secure'],
  troubleshooting: ['error', 'help', 'broken', 'not working', 'issue', 'problem'],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  openclaw: ['openclaw', 'claw', 'bridge', 'local', 'websocket', 'ws://'],
  webhooks: ['webhook', 'webhooks', 'ingest', 'zapier', 'make', 'event', 'feed', 'endpoint'],
  connectors: ['connector', 'connectors', 'stripe', 'github', 'template', 'templates'],
  discord: ['discord'],
  notifications: ['notification', 'notify', 'alert', 'sound', 'ping'],
  sound: ['sound', 'audio', 'music', 'tone', 'beep'],
  eyes: ['eye', 'eyes', 'face', 'visual', 'look', 'expression'],
  privacy: ['privacy', 'private', 'security', 'secure', 'token', 'safe', 'data'],
  animations: ['animation', 'animations', 'idle', 'spectacle', 'fireworks', 'sparkle', 'particle', 'firework', 'gravity', 'dizzy', 'spin', 'pulse', 'eye roll'],
};

export interface RouteResult {
  intent: string;
  topic: string | null;
}

export function routeInput(text: string): RouteResult {
  const lower = text.toLowerCase().trim();

  // Score intents
  let bestIntent = 'unknown';
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Score topics
  let bestTopic: string | null = null;
  let topicScore = 0;
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > topicScore) {
      topicScore = score;
      bestTopic = topic;
    }
  }

  return { intent: bestIntent, topic: bestTopic };
}
