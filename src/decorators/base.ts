/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Base decorators
 * Visual and lifecycle characteristics that don't require a QuadTree.
 */

import { type ParticleCtor } from '../core/Particle';
import type QuadTree from '../quadtree/QuadTree';

// ─── @WithSize ────────────────────────────────────────────────
// Sets the render radius and allocates the shared queryBuffer.
// Place this at the bottom of the decorator stack (applied first)
// so all other decorators can read _state.radius and _state.queryBuffer.

export function WithSize(radius: number) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      constructor(...args: any[]) {
        super(...args);
        this._state.radius = radius;
        this._state.queryBuffer = []; // allocated once, reused every frame
      }
    };
}

// ─── @WithColor ───────────────────────────────────────────────
// Sets fill and stroke to an RGBA color for the particle and all
// decorators further up the chain that call super.render().

export function WithColor(r: number, g: number, b: number, a = 1) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        super.render(ctx);
        ctx.restore();
      }
    };
}

// ─── @WithLifetime ────────────────────────────────────────────
// Tracks age and kills the particle after maxAge seconds.
// Writes _state.age and _state.maxAge for WithFade / WithShrink.

export function WithLifetime(maxAge: number) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      constructor(...args: any[]) {
        super(...args);
        this._state.age = 0;
        this._state.maxAge = maxAge;
      }
      get isAlive(): boolean {
        return (this._state.age as number) < maxAge;
      }
      update(dt: number, qt?: QuadTree): void {
        (this._state.age as number) += dt;
        super.update(dt, qt);
      }
    };
}

// ─── @WithFade ────────────────────────────────────────────────
// Fades globalAlpha from 1 → 0 over the lifetime.
// Requires @WithLifetime somewhere in the stack.

export function WithFade() {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        const { age = 0, maxAge = 1 } = this._state;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - (age as number) / (maxAge as number));
        super.render(ctx);
        ctx.restore();
      }
    };
}

// ─── @WithShrink ──────────────────────────────────────────────
// Scales the rendered size toward zero over the lifetime.
// Requires @WithLifetime somewhere in the stack.

export function WithShrink() {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        const { age = 0, maxAge = 1 } = this._state;
        const s = Math.max(0, 1 - (age as number) / (maxAge as number));
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.scale(s, s);
        ctx.translate(-this.position.x, -this.position.y);
        super.render(ctx);
        ctx.restore();
      }
    };
}

// ─── @WithGlow ────────────────────────────────────────────────
// Adds a canvas shadow-blur halo effect.

export function WithGlow(glowColor = 'white', glowSize = 12) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowSize;
        super.render(ctx);
        ctx.restore();
      }
    };
}
