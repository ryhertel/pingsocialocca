import { useRef, useEffect } from 'react';
import { usePingStore } from '@/stores/usePingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { themePresets } from '@/lib/themes';
import { createSpectacleState, updateSpectacle, renderParticles, forceStartSpectacle } from '@/lib/spectacles';

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
  tintError: boolean, bounceY: number,
) {
  if (h < 1) return;
  const mainColor = tintError ? 'hsl(0, 100%, 62%)' : glowColor;
  const secColor = tintError ? 'hsla(0, 100%, 62%, 0.3)' : glowSecColor;
  const cr = Math.min(cornerR, h / 2);

  ctx.save();
  ctx.globalAlpha = opacity;

  // Outer glow
  ctx.shadowBlur = (40 * glowMult) * intensityMult;
  ctx.shadowColor = mainColor;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(x, y + bounceY, w, h, cr);
  ctx.fill();

  // Second pass for richer glow
  ctx.globalAlpha = opacity * 0.4;
  ctx.fill();

  // Third pass for bloom
  if (glowMult > 1.3) {
    ctx.globalAlpha = opacity * 0.15 * (glowMult - 1);
    ctx.shadowBlur = 80 * intensityMult;
    ctx.fill();
  }

  // Inner highlight
  ctx.globalAlpha = opacity;
  ctx.shadowBlur = 0;
  ctx.fillStyle = secColor;
  const inset = Math.min(3, h / 4);
  const innerH = Math.max(1, h - inset * 2);
  const innerCr = Math.max(0, Math.min(cr - 1, innerH / 2));
  ctx.beginPath();
  ctx.roundRect(x + inset, y + bounceY + inset, w - inset * 2, innerH, innerCr);
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
    let bounceY = 0, targetBounceY = 0;

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

    // Spectacles
    const spectacle = createSpectacleState();

    // Speaking
    let speakPhase = 0;

    // Error
    let errorShakeTime = 0;

    // Emotional state timers
    let emotionTimer = 0;
    let currentEmotion: string | null = null;

    // Message tracking
    let lastMsgCount = usePingStore.getState().messages.length;

    // State transition tracking
    let prevPs = usePingStore.getState().persistentState;

    // Hover
    let isHovered = false;

    // Cursor tracking
    let mouseNX = 0, mouseNY = 0;
    let prevMouseNX = 0, prevMouseNY = 0;
    let cursorTrackingPhase: 'idle' | 'tracking' = 'idle';
    let cursorPhaseTimer = rand(2000, 6000);
    let lastCursorMoveTs = 0;
    let noticeReactionTimer = 0;

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

    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      const dx = nx - mouseNX, dy = ny - mouseNY;
      if (dx * dx + dy * dy > 0.0004) {
        prevMouseNX = mouseNX;
        prevMouseNY = mouseNY;
        mouseNX = nx;
        mouseNY = ny;
        lastCursorMoveTs = performance.now();
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    // Listen for custom emotion events from demo engine
    const onEmotion = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      currentEmotion = detail.emotion;
      emotionTimer = detail.duration || 2000;
    };
    window.addEventListener('ping:emotion', onEmotion);

    // Listen for spectacle trigger events from demo engine
    const onTriggerSpectacle = (e: Event) => {
      const routineName = (e as CustomEvent).detail;
      forceStartSpectacle(spectacle, routineName);
      // Temporarily force idle so spectacle isn't cancelled
      const currentPs = usePingStore.getState().persistentState;
      if (currentPs !== 'idle') {
        usePingStore.getState().setPersistentState('idle');
      }
    };
    window.addEventListener('ping:triggerSpectacle', onTriggerSpectacle);

    function animate(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - lastFrameTime);
      lastFrameTime = now;

      const state = usePingStore.getState();
      const settings = useSettingsStore.getState();
      const theme = themePresets[settings.theme];
      const energy = settings.energyLevel / 100; // 0-1
      const iMult = energy;

      const ps = state.persistentState;
      const tr = state.transientReaction;

      // Detect thinking transition — micro-glance downward
      if (ps === 'thinking' && prevPs !== 'thinking') {
        gazeOverrideTimer = 250;
        targetGY = 0.4;
      }
      prevPs = ps;

      // Reset bored timer on state change
      if (ps !== lastActivityState) {
        lastActivityState = ps;
        nextBoredTime = rand(30000, 70000) / Math.max(0.3, energy);
        boredRoutine = null;
      }

      // — Targets —
      targetSquint = 0;
      targetWiden = 0;
      targetGlow = 1;
      targetBounceY = 0;
      opacity = ps === 'disconnected' ? 0.3 : 1;

      // — Emotional states from events —
      if (currentEmotion && emotionTimer > 0) {
        emotionTimer -= dt;
        switch (currentEmotion) {
          case 'happy':
            targetWiden = 0.3 * iMult;
            targetGlow = Math.max(targetGlow, 1.5);
            targetBounceY = Math.sin(now * 0.008) * 4 * iMult;
            break;
          case 'laugh':
            targetWiden = 0.35 * iMult;
            targetSquint = 0.2 * iMult;
            targetGlow = Math.max(targetGlow, 1.6);
            targetBounceY = Math.sin(now * 0.012) * 6 * iMult;
            break;
          case 'shock':
            targetWiden = 0.5 * iMult;
            targetGlow = Math.max(targetGlow, 2.5);
            break;
          case 'curious':
            targetWiden = 0.2 * iMult;
            targetGX = Math.sin(now * 0.003) * 0.3 * iMult;
            targetGY = -0.15 * iMult;
            break;
          case 'concern':
            targetSquint = 0.35 * iMult;
            targetGY = 0.1;
            targetGlow = Math.max(targetGlow, 0.8);
            break;
          case 'proud':
            targetWiden = 0.25 * iMult;
            targetGlow = Math.max(targetGlow, 2.0);
            targetBounceY = -3 * iMult;
            break;
          case 'surprise':
            targetWiden = 0.4 * iMult;
            targetGlow = Math.max(targetGlow, 2.2);
            targetBounceY = -5 * iMult;
            break;
          case 'cheer':
            targetWiden = 0.3 * iMult;
            targetGlow = Math.max(targetGlow, 1.8);
            targetBounceY = Math.abs(Math.sin(now * 0.01)) * 8 * iMult;
            break;
        }
        if (emotionTimer <= 0) {
          currentEmotion = null;
        }
      }

      if (ps === 'thinking') {
        targetSquint = Math.max(targetSquint, 0.4);
        scanY += dt * 0.0015;
        if (scanY > 1.2) scanY = -1.2;
      } else {
        scanY = -1.2;
      }

      if (ps === 'speaking') {
        speakPhase += dt * 0.004;
        targetGlow = Math.max(targetGlow, 1 + 0.65 * Math.sin(speakPhase * Math.PI) * iMult);
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
        targetWiden = Math.max(targetWiden, 0.25 * iMult);
        targetGlow = Math.max(targetGlow, 1.6);
      } else if (tr === 'notify') {
        targetGlow = Math.max(targetGlow, 2.2);
      }

      if (isHovered && !tr && !currentEmotion) {
        targetWiden = Math.max(targetWiden, 0.12 * iMult);
      }

      // — Blink —
      if (ps !== 'disconnected') {
        const blinkInterval = energy > 0.7 ? rand(2000, 5000) : rand(3000, 8000);
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
            nextBlinkTime = blinkInterval;
          }
        }
      }

      // — Glance —
      if (ps !== 'disconnected') {
        const msgCount = state.messages.length;
        if (msgCount > lastMsgCount) {
          const latestMsg = state.messages[state.messages.length - 1];
          targetGX = 0.4; targetGY = 0.3;
          gazeOverrideTimer = 300;
          if (latestMsg?.role === 'assistant') {
            targetGlow = Math.max(targetGlow, 1.4);
          }
          lastMsgCount = msgCount;
        }

        if (gazeOverrideTimer > 0) {
          gazeOverrideTimer -= dt;
          if (gazeOverrideTimer <= 0) { targetGX = 0; targetGY = 0; }
        }

        if (state.isComposerFocused && gazeOverrideTimer <= 0) {
          targetGY = 0.35;
        }

        // — Cursor Attention —
        const higherPriorityGaze = gazeOverrideTimer > 0 || state.isComposerFocused || ps === 'thinking' || ps === 'speaking';
        const cursorActive = !higherPriorityGaze && !currentEmotion;

        if (cursorActive) {
          const flickDx = mouseNX - prevMouseNX, flickDy = mouseNY - prevMouseNY;
          const flickSpeed = Math.sqrt(flickDx * flickDx + flickDy * flickDy);
          const isFlick = flickSpeed > 0.3;

          if (cursorTrackingPhase === 'idle') {
            cursorPhaseTimer -= dt;
            if (cursorPhaseTimer <= 0 || isFlick) {
              cursorTrackingPhase = 'tracking';
              cursorPhaseTimer = rand(3000, 8000);
              noticeReactionTimer = 300;
            }
          } else if (cursorTrackingPhase === 'tracking') {
            const trackScale = 0.45 * iMult;
            targetGX = mouseNX * trackScale;
            targetGY = mouseNY * trackScale;

            if (noticeReactionTimer > 0) {
              noticeReactionTimer -= dt;
              targetWiden = Math.max(targetWiden, 0.15 * iMult);
              targetGlow = Math.max(targetGlow, 1.3);
            }

            cursorPhaseTimer -= dt;
            const cursorStale = now - lastCursorMoveTs > 3000;
            if (cursorPhaseTimer <= 0 || cursorStale) {
              cursorTrackingPhase = 'idle';
              cursorPhaseTimer = rand(2000, 6000);
              targetGX = 0;
              targetGY = 0;
            }
          }
        } else if (cursorTrackingPhase === 'tracking') {
          cursorTrackingPhase = 'idle';
          cursorPhaseTimer = rand(2000, 6000);
        }

        // Random idle glances
        if (gazeOverrideTimer <= 0 && !state.isComposerFocused && cursorTrackingPhase !== 'tracking' && !currentEmotion) {
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
      if (ps === 'idle' && !boredRoutine && energy > 0.2) {
        nextBoredTime -= dt;
        if (nextBoredTime <= 0) {
          const routines = ['scan', 'orbit', 'sleepDrift', 'doubleBlink', 'wiggle'];
          boredRoutine = routines[Math.floor(Math.random() * routines.length)];
          boredTimer = 0;
          nextBoredTime = rand(30000, 70000) / Math.max(0.3, energy);
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
        } else if (boredRoutine === 'wiggle') {
          targetBounceY = Math.sin(boredTimer * 0.01) * 3 * energy;
          targetGX = Math.sin(boredTimer * 0.005) * 0.15;
          if (boredTimer > 2000) { targetBounceY = 0; targetGX = 0; boredRoutine = null; }
        }
      }

      // — Spectacles (pre-compute canvas dims for particle positioning) —
      const cw = canvas.width, ch = canvas.height;
      const preUnit = Math.min(cw, ch) / 8.5;
      const preEyeW = preUnit * 1.4, preBaseH = preUnit * 0.95;
      const spectacleTargets = updateSpectacle(
        spectacle, dt, now, energy,
        ps === 'idle', !!boredRoutine, !!currentEmotion,
        cw / 2, ch / 2, preEyeW, preBaseH,
        theme.glowPrimary,
        settings.volume ?? 0.5, settings.muted ?? false, settings.dnd ?? false,
      );
      if (spectacle.routine) {
        if (spectacleTargets.targetGX) targetGX = spectacleTargets.targetGX;
        if (spectacleTargets.targetGY) targetGY = spectacleTargets.targetGY;
        if (spectacleTargets.targetBounceY) targetBounceY = spectacleTargets.targetBounceY;
        if (spectacleTargets.targetWiden) targetWiden = Math.max(targetWiden, spectacleTargets.targetWiden);
        if (spectacleTargets.targetGlow) targetGlow = Math.max(targetGlow, spectacleTargets.targetGlow);
        if (spectacleTargets.targetSquint) targetSquint = Math.max(targetSquint, spectacleTargets.targetSquint);
      }

      // — Interpolate —
      const ls = 0.012;
      blink = lerp(blink, targetBlink, dt, ls * 2.5);
      glanceX = lerp(glanceX, targetGX, dt, ls);
      glanceY = lerp(glanceY, targetGY, dt, ls);
      squint = lerp(squint, targetSquint, dt, ls);
      widen = lerp(widen, targetWiden, dt, ls * 1.5);
      glowMult = lerp(glowMult, targetGlow, dt, ls * 2);
      bounceY = lerp(bounceY, targetBounceY, dt, ls * 2);

      // — Render —
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Eyes 30-40% larger: increased from /12 to /8.5
      const unit = Math.min(w, h) / 8.5;
      const eyeW = unit * 1.4;
      const baseH = unit * 0.95;
      const eyeH = baseH * (1 - squint * 0.5) * (1 + widen * 0.3);
      const gap = unit * 0.7;
      // Slightly more square: reduced corner radius ratio
      const cornerR = baseH * 0.28;

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

      drawEye(ctx, leftX, eyeY, eyeW, blinkH, cornerR, glowColor, glowSecColor, glowMult, opacity, iMult, ps === 'error', bounceY);
      drawEye(ctx, rightX, eyeY, eyeW, blinkH, cornerR, glowColor, glowSecColor, glowMult, opacity, iMult, ps === 'error', bounceY);

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

      // — Spectacle particles —
      renderParticles(ctx, spectacle.particles, theme.glowPrimary);

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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('ping:emotion', onEmotion);
      window.removeEventListener('ping:triggerSpectacle', onTriggerSpectacle);
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
