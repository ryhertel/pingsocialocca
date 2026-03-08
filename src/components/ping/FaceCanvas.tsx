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
    let nextGlanceTime = rand(1000, 3000);
    let gazeOverrideTimer = 0;

    // Bored
    let boredRoutine: string | null = null;
    let boredTimer = 0;
    let nextBoredTime = rand(45000, 90000);
    let lastActivityState = '';

    // Spectacles
    const spectacle = createSpectacleState();

    // Floating notification icons
    interface FloatingIcon {
      type: 'dollar' | 'heart' | 'chat' | 'rocket' | 'star' | 'alert' | 'party';
      x: number; y: number; startY: number;
      born: number; lifetime: number;
    }
    const floatingIcons: FloatingIcon[] = [];

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
      const parent = canvas.parentElement;
      canvas.width = parent ? parent.clientWidth : window.innerWidth;
      canvas.height = parent ? parent.clientHeight : window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

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

    // Listen for notification icon events
    const onNotificationIcon = (e: Event) => {
      const iconType = (e as CustomEvent).detail as FloatingIcon['type'];
      const cw = canvas.width, ch = canvas.height;
      floatingIcons.push({
        type: iconType,
        x: cw / 2 + rand(-80, 80),
        y: ch / 2 - 30,
        startY: ch / 2 - 30,
        born: performance.now(),
        lifetime: 2500,
      });
    };
    window.addEventListener('ping:notificationIcon', onNotificationIcon);
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
            targetWiden = 1.2 * iMult;
            targetGlow = Math.max(targetGlow, 2.0);
            targetBounceY = Math.sin(now * 0.008) * 40 * iMult;
            break;
          case 'laugh':
            targetWiden = 1.4 * iMult;
            targetSquint = 0.3 * iMult;
            targetGlow = Math.max(targetGlow, 2.2);
            targetBounceY = Math.sin(now * 0.012) * 50 * iMult;
            break;
          case 'shock':
            targetWiden = 1.8 * iMult;
            targetGlow = Math.max(targetGlow, 3.5);
            targetBounceY = -35 * iMult;
            break;
          case 'curious':
            targetWiden = 1.0 * iMult;
            targetGX = Math.sin(now * 0.003) * 0.6 * iMult;
            targetGY = -0.3 * iMult;
            targetBounceY = Math.sin(now * 0.005) * 15 * iMult;
            break;
          case 'concern':
            targetSquint = 0.8 * iMult;
            targetGY = 0.2;
            targetGlow = Math.max(targetGlow, 0.8);
            targetBounceY = 12 * iMult;
            break;
          case 'proud':
            targetWiden = 1.2 * iMult;
            targetGlow = Math.max(targetGlow, 2.8);
            targetBounceY = -40 * iMult;
            break;
          case 'surprise':
            targetWiden = 1.7 * iMult;
            targetGlow = Math.max(targetGlow, 3.0);
            targetBounceY = -50 * iMult;
            break;
          case 'cheer':
            targetWiden = 1.3 * iMult;
            targetGlow = Math.max(targetGlow, 2.5);
            targetBounceY = Math.abs(Math.sin(now * 0.01)) * 60 * iMult;
            break;
        }
        if (emotionTimer <= 0) {
          currentEmotion = null;
        }
      }

      if (ps === 'thinking') {
        targetSquint = Math.max(targetSquint, 0.7);
        scanY += dt * 0.004;
        if (scanY > 1.2) scanY = -1.2;
      } else {
        scanY = -1.2;
      }

      if (ps === 'speaking') {
        speakPhase += dt * 0.004;
        targetGlow = Math.max(targetGlow, 1 + 2.0 * Math.sin(speakPhase * Math.PI) * iMult);
        targetBounceY = Math.sin(speakPhase * Math.PI * 0.5) * 10 * iMult;
      } else {
        speakPhase = 0;
      }

      if (ps === 'error') {
        errorShakeTime += dt;
        if (errorShakeTime < 600) {
          shakeX = Math.sin(errorShakeTime * 0.08) * 15 * iMult;
        } else {
          shakeX *= 0.85;
        }
      } else {
        shakeX *= 0.85;
        errorShakeTime = 0;
      }

      if (tr === 'success') {
        targetWiden = Math.max(targetWiden, 1.0 * iMult);
        targetGlow = Math.max(targetGlow, 2.5);
        targetBounceY = -15 * iMult;
      } else if (tr === 'notify') {
        targetGlow = Math.max(targetGlow, 2.2);
      }

      if (isHovered && !tr && !currentEmotion) {
        targetWiden = Math.max(targetWiden, 0.5 * iMult);
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
          if (blinkPhaseTimer > 150) { blinkPhase = 'opening'; targetBlink = 0; }
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
            const trackScale = 1.0 * iMult;
            targetGX = mouseNX * trackScale;
            targetGY = mouseNY * trackScale;

            if (noticeReactionTimer > 0) {
              noticeReactionTimer -= dt;
              targetWiden = Math.max(targetWiden, 0.5 * iMult);
              targetGlow = Math.max(targetGlow, 1.6);
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
              targetGX = (Math.random() - 0.5) * 1.5 * iMult;
              targetGY = (Math.random() - 0.5) * 1.2 * iMult;
              isGlancing = true;
              glanceHoldTimer = rand(800, 1800);
              nextGlanceTime = rand(3000, 6000);
            }
          } else {
            glanceHoldTimer -= dt;
            if (glanceHoldTimer <= 0) {
              // Pick next target directly instead of snapping to (0,0)
              targetGX = (Math.random() - 0.5) * 1.5 * iMult;
              targetGY = (Math.random() - 0.5) * 1.2 * iMult;
              isGlancing = false;
              nextGlanceTime = rand(3000, 6000);
            }
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
          targetGX = Math.sin(boredTimer * 0.001) * 1.2;
          if (boredTimer > 4000) { targetGX = 0; boredRoutine = null; }
        } else if (boredRoutine === 'orbit') {
          targetGX = Math.cos(boredTimer * 0.0015) * 1.0;
          targetGY = Math.sin(boredTimer * 0.0015) * 0.8;
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
          targetBounceY = Math.sin(boredTimer * 0.005) * 25 * energy;
          targetGX = Math.sin(boredTimer * 0.0025) * 0.8;
          if (boredTimer > 2000) { targetBounceY = 0; targetGX = 0; boredRoutine = null; }
        }
      }

      // — Spectacles (pre-compute canvas dims for particle positioning) —
      const cw = canvas.width, ch = canvas.height;
      const preUnit = ch / 8.5;
      const preEyeW = preUnit * 1.2, preBaseH = preUnit * 1.15;
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
      const ls = 0.015;
      blink = lerp(blink, targetBlink, dt, 0.06);
      glanceX = lerp(glanceX, targetGX, dt, ls);
      glanceY = lerp(glanceY, targetGY, dt, ls);
      squint = lerp(squint, targetSquint, dt, ls);
      widen = lerp(widen, targetWiden, dt, ls * 2);
      glowMult = lerp(glowMult, targetGlow, dt, ls * 2);
      bounceY = lerp(bounceY, targetBounceY, dt, ls * 2.5);

      // — Render —
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Eye profile constants — single source of truth for both layouts
      const unit = h / 8.5;
      const eyeW = unit * 1.2;
      const baseH = unit * 1.15;
      const eyeH = baseH * (1 - squint * 0.5) * (1 + widen * 0.3);
      const gap = unit * 0.7;
      // Near-square with soft rounded corners
      const cornerR = baseH * 0.25;

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

      // — Floating notification icons —
      for (let i = floatingIcons.length - 1; i >= 0; i--) {
        const icon = floatingIcons[i];
        const age = now - icon.born;
        if (age > icon.lifetime) { floatingIcons.splice(i, 1); continue; }
        const t = age / icon.lifetime; // 0→1
        // Smooth ease-out cubic for upward drift
        const drift = (1 - Math.pow(1 - t, 3)) * 120;
        const wobble = Math.sin(age * 0.004) * 8;
        const drawX = icon.x + wobble;
        const drawY = icon.startY - drift;
        // Bouncy scale-in then fade
        const scaleIn = t < 0.15 ? 1 - Math.pow(1 - t / 0.15, 3) : 1;
        const fadeOut = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        const scale = scaleIn * (0.8 + 0.2 * Math.sin(age * 0.006));
        const alpha = fadeOut * 0.9;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(drawX, drawY);
        ctx.scale(scale, scale);

        const iconColors: Record<string, string> = {
          dollar: 'hsl(45, 100%, 60%)',
          heart: 'hsl(340, 90%, 65%)',
          chat: 'hsl(190, 90%, 65%)',
          rocket: 'hsl(30, 95%, 60%)',
          star: 'hsl(50, 100%, 65%)',
          alert: 'hsl(0, 90%, 60%)',
          party: 'hsl(280, 85%, 65%)',
        };
        const glowColors: Record<string, string> = {
          dollar: 'hsla(45, 100%, 60%, 0.6)',
          heart: 'hsla(340, 90%, 65%, 0.6)',
          chat: 'hsla(190, 90%, 65%, 0.6)',
          rocket: 'hsla(30, 95%, 60%, 0.6)',
          star: 'hsla(50, 100%, 65%, 0.6)',
          alert: 'hsla(0, 90%, 60%, 0.6)',
          party: 'hsla(280, 85%, 65%, 0.6)',
        };
        ctx.fillStyle = iconColors[icon.type] || 'white';
        ctx.shadowBlur = 20;
        ctx.shadowColor = glowColors[icon.type] || 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const symbols: Record<string, string> = { dollar: '$', heart: '♥', chat: '💬', rocket: '🚀', star: '⭐', alert: '⚠', party: '🎉' };
        ctx.fillText(symbols[icon.type] || '•', 0, 0);

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
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('ping:emotion', onEmotion);
      window.removeEventListener('ping:triggerSpectacle', onTriggerSpectacle);
      window.removeEventListener('ping:notificationIcon', onNotificationIcon);
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
