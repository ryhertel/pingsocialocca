import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import App from "./App.tsx";
import { resumeAudio } from "./lib/audio.ts";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Browsers hold the AudioContext suspended until the page sees a gesture, so the
// ambient reel is visual-only until the first interaction. Unlock it once, then
// stop listening.
const unlockAudio = () => {
  resumeAudio();
  ['pointerdown', 'keydown', 'touchstart'].forEach((evt) =>
    window.removeEventListener(evt, unlockAudio)
  );
};
['pointerdown', 'keydown', 'touchstart'].forEach((evt) =>
  window.addEventListener(evt, unlockAudio, { once: false })
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
