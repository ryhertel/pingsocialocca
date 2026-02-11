/**
 * Idle Spectacle System
 * 
 * Provides rare, delightful visual events when Ping is idle:
 * particle effects + coordinated eye reactions.
 * All rendering is canvas-native — no DOM elements.
 */

import { playExcited, playConfirm, playNotify } from './audio';

// ── Types ──

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  hue: number;
  type: 'spark' | 'ring' | 'dust';
  /** For ring type: current radius */
  radius?: number;
}

export interface SpectacleState {
  routine: string | null;
  timer: number;
  nextTime: number;
  particles: Particle[];
  /** Firework-specific: launcher tracking */
  launchers: { x: number; y: number; vy: number; exploded: boolean }[];
  /** Gravity drop physics */
  gravVY: number;
  gravBounces: number;
  /** Sound played flag per spectacle */
  soundPlayed: boolean;
}

export interface SpectacleTargets {
  targetGX: number;
  targetGY: number;
  targetBounceY: number;
  targetWiden: number;
  targetGlow: number;
  targetSquint: number;
}

// ── Helpers ──

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function parseHue(glowPrimary: string): number {
  // glowPrimary is like "160, 100%, 50%" — extract first number
  const m = glowPrimary.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 160;
}

// ── Init ──

export function createSpectacleState(): SpectacleState {
  return {
    routine: null,
    timer: 0,
    nextTime: rand(60000, 120000),
    particles: [],
    launchers: [],
    gravVY: 0,
    gravBounces: 0,
    soundPlayed: false,
  };
}

// ── Available routines by energy level ──

function getAvailableRoutines(energy: number): string[] {
  if (energy <= 0.2) return [];
  if (energy <= 0.5) return ['sparkleTrail', 'gravityDrop'];
  if (energy <= 0.8) return ['sparkleTrail', 'gravityDrop', 'eyeRoll', 'dizzySpin', 'pulseWave'];
  return ['sparkleTrail', 'gravityDrop', 'eyeRoll', 'dizzySpin', 'pulseWave', 'fireworks'];
}

// ── Scheduler ──

export function updateSpectacle(
  ss: SpectacleState,
  dt: number,
  now: number,
  energy: number,
  isIdle: boolean,
  boredActive: boolean,
  emotionActive: boolean,
  cx: number, cy: number,
  eyeW: number, baseH: number,
  glowPrimary: string,
  volume: number, muted: boolean, dnd: boolean,
): SpectacleTargets {
  const targets: SpectacleTargets = {
    targetGX: 0, targetGY: 0, targetBounceY: 0,
    targetWiden: 0, targetGlow: 0, targetSquint: 0,
  };

  // Update existing particles
  for (let i = ss.particles.length - 1; i >= 0; i--) {
    const p = ss.particles[i];
    p.life -= dt;
    if (p.life <= 0) { ss.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'spark') p.vy += 0.0003 * dt; // gravity
    if (p.type === 'dust') p.vy += 0.00005 * dt; // gentle gravity
    if (p.type === 'ring' && p.radius !== undefined) p.radius += 0.15 * dt;
  }

  // If not idle or higher-priority anim active, cancel spectacle
  if (!isIdle || emotionActive) {
    if (ss.routine) {
      ss.routine = null;
      ss.timer = 0;
      ss.launchers = [];
    }
    return targets;
  }

  const hue = parseHue(glowPrimary);

  // ── Active spectacle ──
  if (ss.routine) {
    ss.timer += dt;
    const iMult = energy;

    switch (ss.routine) {
      case 'fireworks':
        runFireworks(ss, dt, now, cx, cy, eyeW, baseH, hue, energy, targets, volume, muted, dnd);
        break;
      case 'eyeRoll':
        runEyeRoll(ss, targets, iMult);
        break;
      case 'sparkleTrail':
        runSparkleTrail(ss, cx, cy, eyeW, baseH, hue, energy, targets, volume, muted, dnd);
        break;
      case 'gravityDrop':
        runGravityDrop(ss, dt, targets, energy);
        break;
      case 'dizzySpin':
        runDizzySpin(ss, targets, iMult);
        break;
      case 'pulseWave':
        runPulseWave(ss, cx, cy, hue, targets, energy, volume, muted, dnd);
        break;
    }
    return targets;
  }

  // ── Scheduler: pick next spectacle ──
  if (boredActive) return targets;

  ss.nextTime -= dt;
  if (ss.nextTime <= 0) {
    const routines = getAvailableRoutines(energy);
    if (routines.length > 0) {
      ss.routine = routines[Math.floor(Math.random() * routines.length)];
      ss.timer = 0;
      ss.soundPlayed = false;
      ss.launchers = [];
      ss.gravVY = 0;
      ss.gravBounces = 0;
    }
    // Scale interval inversely with energy
    const base = energy > 0.8 ? rand(50000, 90000) : rand(60000, 120000);
    ss.nextTime = base;
  }

  return targets;
}

// ── Spectacle Implementations ──

function runFireworks(
  ss: SpectacleState, dt: number, _now: number,
  cx: number, cy: number, eyeW: number, baseH: number,
  hue: number, energy: number, t: SpectacleTargets,
  vol: number, muted: boolean, dnd: boolean,
) {
  const iMult = energy;
  // Phase 1: spawn launchers at t=0
  if (ss.timer < dt + 1 && ss.launchers.length === 0) {
    const count = energy > 0.8 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      ss.launchers.push({
        x: cx + rand(-eyeW * 1.5, eyeW * 1.5),
        y: cy + baseH,
        vy: -rand(0.25, 0.4),
        exploded: false,
      });
    }
  }

  // Update launchers
  for (const l of ss.launchers) {
    if (l.exploded) continue;
    l.y += l.vy * dt;
    l.vy += 0.0002 * dt; // decelerate

    // Trail particle
    if (Math.random() < 0.3) {
      ss.particles.push({
        x: l.x, y: l.y, vx: rand(-0.01, 0.01), vy: 0.02,
        life: 400, maxLife: 400, size: 2, hue, type: 'spark',
      });
    }

    // Explode when velocity near zero or above center
    if (l.vy > -0.05 || l.y < cy - baseH * 0.5) {
      l.exploded = true;
      const sparkCount = energy > 0.8 ? 12 : 8;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + rand(-0.2, 0.2);
        const speed = rand(0.08, 0.2);
        ss.particles.push({
          x: l.x, y: l.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: rand(600, 1000), maxLife: 1000,
          size: rand(2, 4), hue: hue + rand(-20, 20), type: 'spark',
        });
      }
      // Eye reaction per burst
      t.targetWiden = 0.4 * iMult;
      t.targetGlow = 2.5;
      t.targetBounceY = -4 * iMult;

      if (!ss.soundPlayed) {
        ss.soundPlayed = true;
        playExcited(vol, muted, dnd);
      }
    }
  }

  // Glow during fireworks
  t.targetGlow = Math.max(t.targetGlow, 1.5);

  // End when all exploded and particles mostly gone
  if (ss.launchers.every(l => l.exploded) && ss.timer > 2500) {
    ss.routine = null;
  }
}

function runEyeRoll(ss: SpectacleState, t: SpectacleTargets, iMult: number) {
  const duration = 1500;
  const progress = Math.min(ss.timer / duration, 1);
  // Ease in-out
  const ease = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const angle = ease * Math.PI * 2;
  t.targetGX = Math.cos(angle - Math.PI / 2) * 0.5 * iMult;
  t.targetGY = Math.sin(angle - Math.PI / 2) * 0.4 * iMult;

  if (ss.timer >= duration) {
    t.targetGX = 0; t.targetGY = 0;
    ss.routine = null;
  }
}

function runSparkleTrail(
  ss: SpectacleState, cx: number, cy: number,
  eyeW: number, _baseH: number, hue: number, energy: number,
  t: SpectacleTargets,
  vol: number, muted: boolean, dnd: boolean,
) {
  // Spawn particles in first 300ms
  if (ss.timer < 300 && Math.random() < 0.4) {
    const count = energy > 0.8 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      ss.particles.push({
        x: cx + side * eyeW * 0.5 + rand(-5, 5),
        y: cy + rand(-5, 5),
        vx: side * rand(0.02, 0.06),
        vy: rand(-0.03, 0.01),
        life: rand(1200, 2000), maxLife: 2000,
        size: rand(1.5, 3), hue: hue + rand(-15, 15), type: 'dust',
      });
    }
  }

  t.targetWiden = 0.15 * energy;
  t.targetGlow = Math.max(1.4, t.targetGlow);

  if (!ss.soundPlayed) {
    ss.soundPlayed = true;
    playConfirm(vol * 0.4, muted, dnd);
  }

  if (ss.timer > 2200 && ss.particles.filter(p => p.type === 'dust').length === 0) {
    ss.routine = null;
  }
}

function runGravityDrop(ss: SpectacleState, dt: number, t: SpectacleTargets, energy: number) {
  if (ss.timer < dt + 1) {
    ss.gravVY = 0;
    ss.gravBounces = 0;
  }

  ss.gravVY += 0.02 * dt; // gravity
  t.targetBounceY = (t.targetBounceY || 0) + ss.gravVY;

  // Bounce at floor (bounceY = 15)
  if (t.targetBounceY > 15) {
    t.targetBounceY = 15;
    ss.gravVY *= -0.6;
    ss.gravBounces++;
  }

  if (ss.gravBounces >= 4 || ss.timer > 2500) {
    t.targetBounceY = 0;
    ss.routine = null;
  }
}

function runDizzySpin(ss: SpectacleState, t: SpectacleTargets, iMult: number) {
  const duration = 2000;
  const progress = Math.min(ss.timer / duration, 1);
  const angle = progress * Math.PI * 4; // 2 full rotations
  // Spiral: radius grows then shrinks
  const radius = progress < 0.5
    ? 0.1 + progress * 0.8
    : 0.5 - (progress - 0.5) * 0.8;
  t.targetGX = Math.cos(angle) * radius * iMult;
  t.targetGY = Math.sin(angle) * radius * 0.6 * iMult;
  t.targetSquint = progress < 0.8 ? 0.25 * iMult : 0;

  if (progress >= 1) {
    t.targetWiden = 0.2 * iMult;
    ss.routine = null;
  }
}

function runPulseWave(
  ss: SpectacleState, cx: number, cy: number,
  hue: number, t: SpectacleTargets, energy: number,
  vol: number, muted: boolean, dnd: boolean,
) {
  // Spawn 3 rings staggered
  const ringTimes = [0, 400, 800];
  for (const rt of ringTimes) {
    if (ss.timer >= rt && ss.timer < rt + 20) {
      ss.particles.push({
        x: cx, y: cy, vx: 0, vy: 0,
        life: 1500, maxLife: 1500,
        size: 2, hue, type: 'ring', radius: 5,
      });
    }
  }

  // Pulse glow in sync
  const pulse = Math.sin(ss.timer * 0.006) * 0.5 + 0.5;
  t.targetGlow = Math.max(t.targetGlow, 1 + pulse * 1.5);

  if (!ss.soundPlayed) {
    ss.soundPlayed = true;
    playNotify(vol * 0.5, muted, dnd);
  }

  if (ss.timer > 2500 && ss.particles.filter(p => p.type === 'ring').length === 0) {
    ss.routine = null;
  }
}

// ── Particle Renderer ──

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  glowPrimary: string,
) {
  if (particles.length === 0) return;

  ctx.save();
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);

    if (p.type === 'ring') {
      const r = p.radius || 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.4})`;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      const lightness = p.type === 'dust' ? '80%' : '65%';
      ctx.fillStyle = `hsla(${p.hue}, 100%, ${lightness}, ${alpha})`;
      ctx.shadowBlur = p.type === 'dust' ? 8 : 12;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`;
      ctx.fill();
    }
  }
  ctx.restore();
}
