import { useRef, useEffect } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(current: number, target: number, dt: number, speed: number) {
  return current + (target - current) * Math.min(1, dt * speed);
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  cornerR: number, glowColor: string, glowSecColor: string,
  glowMult: number, opacity: number, intensityMult: number,
  tintError: boolean,
) {
  if (h < 1) return;
  const mainColor = tintError ? 'hsl(0, 100%, 62%)' : glowColor;
  const secColor = tintError ? 'hsla(0, 100%, 62%, 0.3)' : glowSecColor;
  const cr = Math.min(cornerR, h / 2);

  ctx.save();
  ctx.globalAlpha = opacity;

  // Outer glow
  ctx.shadowBlur = (35 * glowMult) * intensityMult;
  ctx.shadowColor = mainColor;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, cr);
  ctx.fill();

  // Second pass for richer glow
  ctx.globalAlpha = opacity * 0.35;
  ctx.fill();

  // Inner highlight
  ctx.globalAlpha = opacity;
  ctx.shadowBlur = 0;
  ctx.fillStyle = secColor;
  const inset = Math.min(3, h / 4);
  const innerH = Math.max(1, h - inset * 2);
  const innerCr = Math.max(0, Math.min(cr - 1, innerH / 2));
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, w - inset * 2, innerH, innerCr);
  ctx.fill();

  ctx.restore();
}

export function FaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Animation values
    let blink = 0, targetBlink = 0;
    let glanceX = 0, glanceY = 0, targetGX = 0, targetGY = 0;
    let squint = 0, targetSquint = 0;
    let widen = 0, targetWiden = 0;
    let glowMult = 1, targetGlow = 1;
    let shakeX = 0;
    let opacity = 1;
    let scanY = -1.2;

    // Blink
    let blinkPhase: 'idle' | 'closing' | 'closed' | 'opening' = 'idle';
    let blinkPhaseTimer = 0;
    let nextBlinkTime = rand(3000, 7000);

    // Glance
    let isGlancing = false;
    let glanceHoldTimer = 0;
    let nextGlanceTime = rand(2000, 5000);
    let gazeOverrideTimer = 0;

    // Bored
    let boredRoutine: string | null = null;
    let boredTimer = 0;
    let nextBoredTime = rand(45000, 90000);
    let lastActivityState = '';

    // Speaking
    let speakPhase = 0;

    // Error
    let errorShakeTime = 0;

    // Message tracking
    let lastMsgCount = usePingStore.getState().messages.length;

    // Hover
    let isHovered = false;

    let lastFrameTime = performance.now();
    let animId: number;
    let slowTimeoutId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const onEnter = () => { isHovered = true; };
    const onLeave = () => { isHovered = false; };
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchstart', onEnter, { passive: true });
    canvas.addEventListener('touchend', () => {
      setTimeout(() => { isHovered = false; }, 500);
    }, { passive: true });

    function animate(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - lastFrameTime);
      lastFrameTime = now;

      const state = usePingStore.getState();
      const settings = useSettingsStore.getState();
      const theme = themePresets[settings.theme];
      const iMult = settings.animationIntensity === 'high' ? 1 : settings.animationIntensity === 'medium' ? 0.7 : 0.3;

      const ps = state.persistentState;
      const tr = state.transientReaction;

      // Reset bored timer on state change
      if (ps !== lastActivityState) {
        lastActivityState = ps;
        nextBoredTime = rand(45000, 90000);
        boredRoutine = null;
      }

      // — Targets —
      targetSquint = 0;
      targetWiden = 0;
      targetGlow = 1;
      opacity = ps === 'disconnected' ? 0.3 : 1;

      if (ps === 'thinking') {
        targetSquint = 0.4;
        scanY += dt * 0.0015;
        if (scanY > 1.2) scanY = -1.2;
      } else {
        scanY = -1.2;
      }

      if (ps === 'speaking') {
        speakPhase += dt * 0.004;
        targetGlow = 1 + 0.5 * Math.sin(speakPhase * Math.PI) * iMult;
      } else {
        speakPhase = 0;
      }

      if (ps === 'error') {
        errorShakeTime += dt;
        if (errorShakeTime < 600) {
          shakeX = Math.sin(errorShakeTime * 0.06) * 3 * iMult;
        } else {
          shakeX *= 0.85;
        }
      } else {
        shakeX *= 0.85;
        errorShakeTime = 0;
      }

      if (tr === 'success') {
        targetWiden = 0.25 * iMult;
        targetGlow = Math.max(targetGlow, 1.6);
      } else if (tr === 'notify') {
        targetGlow = Math.max(targetGlow, 2.2);
      }

      if (isHovered && !tr) {
        targetWiden = Math.max(targetWiden, 0.12 * iMult);
      }

      // — Blink —
      if (ps !== 'disconnected') {
        if (blinkPhase === 'idle') {
          nextBlinkTime -= dt;
          if (nextBlinkTime <= 0) {
            blinkPhase = 'closing';
            targetBlink = 1;
          }
        } else if (blinkPhase === 'closing') {
          if (blink > 0.9) { blinkPhase = 'closed'; blinkPhaseTimer = 0; }
        } else if (blinkPhase === 'closed') {
          blinkPhaseTimer += dt;
          if (blinkPhaseTimer > 60) { blinkPhase = 'opening'; targetBlink = 0; }
        } else if (blinkPhase === 'opening') {
          if (blink < 0.05) {
            blink = 0;
            blinkPhase = 'idle';
            nextBlinkTime = rand(3000, 7000);
          }
        }
      }

      // — Glance —
      if (ps !== 'disconnected') {
        const msgCount = state.messages.length;
        if (msgCount > lastMsgCount) {
          targetGX = 0.4; targetGY = 0.3;
          gazeOverrideTimer = 1200;
          lastMsgCount = msgCount;
        }

        if (gazeOverrideTimer > 0) {
          gazeOverrideTimer -= dt;
          if (gazeOverrideTimer <= 0) { targetGX = 0; targetGY = 0; }
        }

        if (state.isComposerFocused && gazeOverrideTimer <= 0) {
          targetGY = 0.35;
        }

        if (gazeOverrideTimer <= 0 && !state.isComposerFocused) {
          if (!isGlancing) {
            nextGlanceTime -= dt;
            if (nextGlanceTime <= 0) {
              targetGX = (Math.random() - 0.5) * 0.6 * iMult;
              targetGY = (Math.random() - 0.5) * 0.4 * iMult;
              isGlancing = true;
              glanceHoldTimer = rand(500, 1000);
              nextGlanceTime = rand(2000, 5000);
            }
          } else {
            glanceHoldTimer -= dt;
            if (glanceHoldTimer <= 0) { targetGX = 0; targetGY = 0; isGlancing = false; }
          }
        }
      }

      // — Bored routines —
      if (ps === 'idle' && !boredRoutine && settings.animationIntensity !== 'low') {
        nextBoredTime -= dt;
        if (nextBoredTime <= 0) {
          const routines = ['scan', 'orbit', 'sleepDrift', 'doubleBlink'];
          boredRoutine = routines[Math.floor(Math.random() * routines.length)];
          boredTimer = 0;
          nextBoredTime = rand(45000, 90000);
        }
      }

      if (boredRoutine) {
        boredTimer += dt;
        if (boredRoutine === 'scan') {
          targetGX = Math.sin(boredTimer * 0.002) * 0.5;
          if (boredTimer > 3000) { targetGX = 0; boredRoutine = null; }
        } else if (boredRoutine === 'orbit') {
          targetGX = Math.cos(boredTimer * 0.003) * 0.3;
          targetGY = Math.sin(boredTimer * 0.003) * 0.2;
          if (boredTimer > 3500) { targetGX = 0; targetGY = 0; boredRoutine = null; }
        } else if (boredRoutine === 'sleepDrift') {
          targetSquint = Math.min(0.5, boredTimer * 0.0003);
          if (boredTimer > 3000) { targetSquint = 0; boredRoutine = null; }
        } else if (boredRoutine === 'doubleBlink') {
          if (boredTimer < 80) targetBlink = 1;
          else if (boredTimer < 200) targetBlink = 0;
          else if (boredTimer < 300) targetBlink = 1;
          else if (boredTimer < 450) targetBlink = 0;
          else boredRoutine = null;
        }
      }

      // — Interpolate —
      const ls = 0.012;
      blink = lerp(blink, targetBlink, dt, ls * 2.5);
      glanceX = lerp(glanceX, targetGX, dt, ls);
      glanceY = lerp(glanceY, targetGY, dt, ls);
      squint = lerp(squint, targetSquint, dt, ls);
      widen = lerp(widen, targetWiden, dt, ls * 1.5);
      glowMult = lerp(glowMult, targetGlow, dt, ls * 2);

      // — Render —
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const unit = Math.min(w, h) / 12;
      const eyeW = unit * 1.3;
      const baseH = unit * 0.85;
      const eyeH = baseH * (1 - squint * 0.5) * (1 + widen * 0.3);
      const gap = unit * 0.65;
      const cornerR = baseH * 0.35;

      const cx = w / 2 + shakeX;
      const cy = h / 2;
      const blinkH = eyeH * (1 - blink);
      const offX = glanceX * eyeW * 0.3;
      const offY = glanceY * baseH * 0.3;

      const glowColor = `hsl(${theme.glowPrimary})`;
      const glowSecColor = `hsla(${theme.glowSecondary}, 0.35)`;

      const leftX = cx - gap / 2 - eyeW + offX;
      const rightX = cx + gap / 2 + offX;
      const eyeY = cy - blinkH / 2 + offY;

      drawEye(ctx, leftX, eyeY, eyeW, blinkH, cornerR, glowColor, glowSecColor, glowMult, opacity, iMult, ps === 'error');
      drawEye(ctx, rightX, eyeY, eyeW, blinkH, cornerR, glowColor, glowSecColor, glowMult, opacity, iMult, ps === 'error');

      // Thinking scanline
      if (squint > 0.08) {
        const scanWorldY = cy + scanY * baseH * 0.5 + offY;
        const mainCol = ps === 'error' ? 'hsl(0, 100%, 62%)' : glowColor;
        ctx.save();
        ctx.globalAlpha = squint * 0.35 * opacity;
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = mainCol;
        ctx.beginPath();
        ctx.moveTo(leftX - 10, scanWorldY);
        ctx.lineTo(rightX + eyeW + 10, scanWorldY);
        ctx.stroke();
        ctx.restore();
      }

      // Next frame
      if (document.hidden) {
        slowTimeoutId = window.setTimeout(() => {
          if (running) animId = requestAnimationFrame(animate);
        }, 200);
      } else {
        animId = requestAnimationFrame(animate);
      }
    }

    animId = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      clearTimeout(slowTimeoutId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
