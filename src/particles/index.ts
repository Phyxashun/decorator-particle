/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Particle type definitions
 *
 * Each export is a factory that accepts `bounds` and returns a
 * class with a fixed decorator stack baked into its prototype.
 * Instantiate them exactly like any regular class:
 *
 *   const Cls = makeFlockClass(bounds)
 *   system.add(new Cls(position, velocity))
 *
 * Decorator stacking order — decorators are applied bottom → top.
 * The bottom decorator (@WithSize) runs first in the constructor,
 * the top decorator runs first in render() / update().
 *
 * DECORATOR COVERAGE — every decorator is the star of at least one mode:
 *
 * WithSize        → all modes (radius)
 * WithColor       → all modes (fill)
 * WithLifetime    → Sparks, Bubbles, Confetti, Snow, Constellation
 * WithFade        → Sparks, Bubbles, Confetti, Snow, Constellation
 * WithShrink      → Sparks       ← primary showcase
 * WithGlow        → Bubbles      ← primary showcase
 * WithGravity     → Sparks, Confetti, Snow
 * WithTrail       → Sparks       ← primary showcase
 * WithBounce      → Bouncers, Repulsor, Orbital
 * WithWrap        → Flock, Constellation
 * WithSpeedLimit  → Flock, Bouncers, Repulsor, Orbital
 * WithDrag        → Snow, Constellation, Repulsor, Orbital ← Snow primary
 * WithRotation    → Confetti, Bouncers ← primary showcase
 * WithRepulsion   → Repulsor, Orbital
 * WithAttraction  → Constellation, Orbital
 * WithFlocking    → Flock        ← primary showcase
 * WithLinkDraw    → Constellation ← primary showcase
 */

import Particle from '../core/Particle';
import { WithSize, WithColor, WithLifetime, WithFade, WithGlow, WithShrink } from '../decorators/base';
import {
  WithTrail,
  WithBounce,
  WithWrap,
  WithSpeedLimit,
  WithDrag,
  WithRotation,
  WithGravity,
} from '../decorators/motion';
import { WithRepulsion, WithAttraction, WithFlocking, WithLinkDraw } from '../decorators/spatial';

type Bounds = { width: number; height: number };

/** Compose an array of decorator factories onto a base class. */
export function applyDecorators<T extends typeof Particle>(decorators: Array<(Base: any) => any>, Base: T): T {
  return decorators.reduceRight((cls, dec) => dec(cls), Base) as T;
}

// ─── SparkParticle ────────────────────────────────────────────
// Short-lived embers fired upward, pulled down by gravity.
// PRIMARY: @WithGravity · @WithTrail · @WithShrink
// ALSO:    @WithFade · @WithGlow · @WithLifetime

export function makeSparkClass() {
  return applyDecorators(
    [
      WithFade(),
      WithShrink(),
      WithGravity(0, 420),
      WithTrail(16, 'rgba(255,160,40,0.18)'),
      WithGlow('orange', 9),
      WithColor(255, 160, 40),
      WithLifetime(0.8),
      WithSize(2.5),
    ],
    Particle
  );
}

// ─── BubbleParticle ───────────────────────────────────────────
// Large, slow-rising spheres with a strong glow halo.
// PRIMARY: @WithGlow (large radius + big size)
// ALSO:    @WithFade · @WithLifetime

export function makeBubbleClass() {
  return applyDecorators(
    [WithFade(), WithGlow('rgba(100,200,255,1)', 22), WithColor(80, 180, 255, 0.65), WithLifetime(3.5), WithSize(16)],
    Particle
  );
}

// ─── ConfettiParticle ─────────────────────────────────────────
// Tumbling squares in random colors, falling under gravity.
// PRIMARY: @WithRotation
// ALSO:    @WithGravity · @WithFade · @WithLifetime
// NOTE:    Returns a factory so each instance picks a random color.

const CONFETTI_COLORS: Array<[number, number, number]> = [
  [255, 80, 120],
  [80, 210, 120],
  [80, 150, 255],
  [255, 200, 60],
  [200, 80, 255],
  [255, 130, 60],
];

export function makeConfettiClass() {
  const [r, g, b] = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const spin = Math.PI * (Math.random() > 0.5 ? 2.5 : -2.5);
  return applyDecorators(
    [WithFade(), WithRotation(spin), WithGravity(0, 220), WithColor(r, g, b), WithLifetime(2.0), WithSize(5)],
    Particle
  );
}

// ─── SnowParticle ─────────────────────────────────────────────
// Gently drifting flakes with fluid drag slowing their fall.
// PRIMARY: @WithDrag
// ALSO:    @WithGravity · @WithFade · @WithLifetime

export function makeSnowClass() {
  return applyDecorators(
    [WithFade(), WithDrag(0.94), WithGravity(0, 45), WithColor(220, 235, 255, 0.9), WithLifetime(6), WithSize(3)],
    Particle
  );
}

// ─── BouncerParticle ──────────────────────────────────────────
// Spinning squares bouncing off all four walls indefinitely.
// PRIMARY: @WithBounce · @WithRotation
// ALSO:    @WithGlow · @WithSpeedLimit

export function makeBounceClass(bounds: Bounds) {
  return applyDecorators(
    [
      WithSpeedLimit(280),
      WithBounce(bounds, 0.85),
      WithRotation(Math.PI * (Math.random() > 0.5 ? 1.5 : -1.5)),
      WithGlow('rgba(255,210,80,0.6)', 14),
      WithColor(255, 210, 80),
      WithSize(6),
    ],
    Particle
  );
}

// ─── FlockParticle ────────────────────────────────────────────
// Reynolds boids — separation, alignment, cohesion.
// PRIMARY: @WithFlocking · @WithWrap
// ALSO:    @WithSpeedLimit · @WithGlow

export function makeFlockClass(bounds: Bounds) {
  return applyDecorators(
    [
      WithWrap(bounds),
      WithSpeedLimit(200),
      WithFlocking(90, 28, { sep: 2.0, align: 1.2, coh: 1.0 }, 280, 200),
      WithGlow('rgba(80,200,255,0.5)', 6),
      WithColor(80, 200, 255),
      WithSize(3),
    ],
    Particle
  );
}

// ─── ConstellationParticle ────────────────────────────────────
// Slow drifting nodes connected by proximity lines.
// PRIMARY: @WithLinkDraw · @WithAttraction
// ALSO:    @WithDrag · @WithWrap · @WithFade · @WithLifetime

export function makeConstellationClass(bounds: Bounds) {
  return applyDecorators(
    [
      WithFade(),
      WithLinkDraw(110, 'rgba(140,185,255,1)', 0.6),
      WithWrap(bounds),
      WithSpeedLimit(80),
      WithDrag(0.97),
      WithAttraction(110, 30, 15),
      WithColor(200, 220, 255, 0.9),
      WithLifetime(14),
      WithSize(2),
    ],
    Particle
  );
}

// ─── RepulsorParticle ─────────────────────────────────────────
// Mutual repulsion + drag → crystalline equilibrium spacing.
// PRIMARY: @WithRepulsion
// ALSO:    @WithDrag · @WithBounce · @WithSpeedLimit · @WithGlow

export function makeRepulsorClass(bounds: Bounds) {
  return applyDecorators(
    [
      WithBounce(bounds, 0.6),
      WithSpeedLimit(300),
      WithDrag(0.95),
      WithRepulsion(55, 350),
      WithGlow('rgba(255,100,180,0.6)', 10),
      WithColor(255, 100, 180),
      WithSize(4),
    ],
    Particle
  );
}

// ─── OrbitalParticle ──────────────────────────────────────────
// Attraction + repulsion balance → natural equilibrium distance.
// PRIMARY: @WithAttraction + @WithRepulsion (combined)
// ALSO:    @WithDrag · @WithTrail · @WithBounce · @WithGlow

export function makeOrbitalClass(bounds: Bounds) {
  return applyDecorators(
    [
      WithBounce(bounds, 0.5),
      WithSpeedLimit(250),
      WithDrag(0.96),
      WithRepulsion(40, 600),
      WithAttraction(140, 20, 10),
      WithTrail(10, 'rgba(120,255,180,0.1)'),
      WithGlow('rgba(120,255,180,0.5)', 8),
      WithColor(120, 255, 180),
      WithSize(3),
    ],
    Particle
  );
}
