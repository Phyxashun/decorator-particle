/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Motion decorators
 * Physics modifiers that don't require spatial neighbor queries.
 */

import Vector2D from '../core/Vector2D';
import { type ParticleCtor } from '../core/Particle';
import type QuadTree from '../quadtree/QuadTree';

// ─── @WithGravity ─────────────────────────────────────────────
// Applies a constant gravitational acceleration (px/s²) each frame.
// Default is downward at 300 px/s².

export function WithGravity(gx = 0, gy = 300) {
  const g = new Vector2D(gx, gy);
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        this.acceleration = this.acceleration.add(g);
        super.update(dt, qt);
      }
    };
}

// ─── @WithTrail ───────────────────────────────────────────────
// Records the last maxLength positions and draws a fading polyline.

export function WithTrail(maxLength = 20, trailColor = 'rgba(255,255,255,0.15)') {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      constructor(...args: any[]) {
        super(...args);
        this._state.history = [];
      }
      update(dt: number, qt?: QuadTree): void {
        const h = this._state.history as Vector2D[];
        h.push(this.position.clone());
        if (h.length > maxLength) h.shift();
        super.update(dt, qt);
      }
      render(ctx: CanvasRenderingContext2D): void {
        const h = this._state.history as Vector2D[];
        if (h.length > 1) {
          ctx.save();
          ctx.lineWidth = this._state.radius ?? 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 1; i < h.length; i++) {
            ctx.globalAlpha = (i / h.length) * 0.7;
            ctx.strokeStyle = trailColor;
            ctx.beginPath();
            ctx.moveTo(h[i - 1].x, h[i - 1].y);
            ctx.lineTo(h[i].x, h[i].y);
            ctx.stroke();
          }
          ctx.restore();
        }
        super.render(ctx);
      }
    };
}

// ─── @WithBounce ──────────────────────────────────────────────
// Reflects velocity when the particle hits canvas bounds.
// restitution < 1 loses energy on each bounce.

export function WithBounce(bounds: { width: number; height: number }, restitution = 0.75) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        super.update(dt, qt);
        const { width, height } = bounds;
        const r = this._state.radius ?? 4;

        if (this.position.x - r < 0) {
          this.position = new Vector2D(r, this.position.y);
          this.velocity = new Vector2D(-this.velocity.x * restitution, this.velocity.y);
        } else if (this.position.x + r > width) {
          this.position = new Vector2D(width - r, this.position.y);
          this.velocity = new Vector2D(-this.velocity.x * restitution, this.velocity.y);
        }

        if (this.position.y - r < 0) {
          this.position = new Vector2D(this.position.x, r);
          this.velocity = new Vector2D(this.velocity.x, -this.velocity.y * restitution);
        } else if (this.position.y + r > height) {
          this.position = new Vector2D(this.position.x, height - r);
          this.velocity = new Vector2D(this.velocity.x, -this.velocity.y * restitution);
        }
      }
    };
}

// ─── @WithWrap ────────────────────────────────────────────────
// Toroidal wrapping — particles leaving one edge re-enter from
// the opposite side. Preferred over WithBounce for flocking.

export function WithWrap(bounds: { width: number; height: number }) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        super.update(dt, qt);
        const { width, height } = bounds;
        if (this.position.x < 0) this.position = new Vector2D(width, this.position.y);
        if (this.position.x > width) this.position = new Vector2D(0, this.position.y);
        if (this.position.y < 0) this.position = new Vector2D(this.position.x, height);
        if (this.position.y > height) this.position = new Vector2D(this.position.x, 0);
      }
    };
}

// ─── @WithSpeedLimit ──────────────────────────────────────────
// Hard velocity cap. Essential when spatial forces (repulsion,
// flocking) can accumulate large accelerations in one frame.

export function WithSpeedLimit(maxSpeed: number) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        super.update(dt, qt);
        const speed = this.velocity.mag();
        if (speed > maxSpeed) this.velocity = this.velocity.scale(maxSpeed / speed);
      }
    };
}

// ─── @WithDrag ────────────────────────────────────────────────
// Multiplicative velocity damping each frame.
// coefficient = 0.98 → lose 2% speed per frame at 60 fps.
// Essential for repulsion/attraction systems to reach equilibrium.

export function WithDrag(coefficient = 0.98) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        super.update(dt, qt);
        this.velocity = this.velocity.scale(Math.pow(coefficient, dt * 60));
      }
    };
}

// ─── @WithRotation ────────────────────────────────────────────
// Rotates the particle at a constant angular velocity (rad/s).
// Renders as a rotated square instead of a circle.

export function WithRotation(angularVelocity = Math.PI) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      constructor(...args: any[]) {
        super(...args);
        this._state.angle = 0;
      }
      update(dt: number, qt?: QuadTree): void {
        (this._state.angle as number) += angularVelocity * dt;
        super.update(dt, qt);
      }
      render(ctx: CanvasRenderingContext2D): void {
        const r = this._state.radius ?? 4;
        const angle = (this._state.angle as number) ?? 0;
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(-r, -r, r * 2, r * 2);
        ctx.fill();
        ctx.restore();
        // Intentionally skip super.render() — shape is fully replaced
      }
    };
}
