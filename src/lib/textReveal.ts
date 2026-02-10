import type { AnimationIntensity } from './types';

export function startTextReveal(
  messageId: string,
  fullText: string,
  intensity: AnimationIntensity,
  onReveal: (id: string, text: string) => void,
  onComplete: () => void,
): () => void {
  const words = fullText.split(/\s+/);
  const chunkSize = Math.floor(Math.random() * 11) + 12; // 12–22 words
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, Math.min(i + chunkSize, words.length)).join(' '));
  }

  if (chunks.length <= 1) {
    onReveal(messageId, fullText);
    const t = window.setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }

  const interval = intensity === 'high' ? 220 : intensity === 'medium' ? 320 : 420;
  let idx = 0;
  let revealed = '';
  let doneTimeout: number | undefined;

  const timer = window.setInterval(() => {
    revealed += (revealed ? ' ' : '') + chunks[idx];
    onReveal(messageId, revealed);
    idx++;
    if (idx >= chunks.length) {
      clearInterval(timer);
      doneTimeout = window.setTimeout(onComplete, 1500);
    }
  }, interval);

  return () => {
    clearInterval(timer);
    if (doneTimeout) clearTimeout(doneTimeout);
  };
}
