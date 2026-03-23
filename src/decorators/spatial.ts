/**
 * Spatial decorators
 * These query the QuadTree (passed via update's qt param / _state.qt)
 * to find neighbors in O(k) rather than O(n).
 *
 * All use _state.queryBuffer (pre-allocated by @WithSize) to avoid
 * per-frame heap allocations in the hot path.
 */

import Vector2D from '../core/Vector2D';
import Particle, { type ParticleCtor } from '../core/Particle';
import Rect from '../quadtree/Rect';
import type QuadTree from '../quadtree/QuadTree';

// ─── @WithRepulsion ───────────────────────────────────────────
// Pushes away from every neighbor within `radius` px.
// Force falls off linearly: strongest at the center, zero at the edge.

export function WithRepulsion(radius = 60, force = 200) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        if (qt) {
          const buf = this._state.queryBuffer as Particle[];
          buf.length = 0;
          qt.query(Rect.circle(this.position.x, this.position.y, radius), buf);

          for (const other of buf) {
            if (other === (this as unknown as Particle)) continue;
            const dx = this.position.x - other.position.x;
            const dy = this.position.y - other.position.y;
            const distSq = dx * dx + dy * dy;
            if (distSq === 0 || distSq > radius * radius) continue;

            const dist = Math.sqrt(distSq);
            const strength = force * (1 - dist / radius);
            this.acceleration = this.acceleration.add(new Vector2D(dx / dist, dy / dist).scale(strength));
          }
        }
        super.update(dt, qt);
      }
    };
}

// ─── @WithAttraction ──────────────────────────────────────────
// Pulls toward every neighbor within `radius` px.
// Softened inverse-square falloff prevents singularity at dist ≈ 0.

export function WithAttraction(radius = 120, force = 50, soften = 20) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        if (qt) {
          const buf = this._state.queryBuffer as Particle[];
          buf.length = 0;
          qt.query(Rect.circle(this.position.x, this.position.y, radius), buf);

          for (const other of buf) {
            if (other === (this as unknown as Particle)) continue;
            const dx = other.position.x - this.position.x;
            const dy = other.position.y - this.position.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > radius * radius) continue;

            const dist = Math.sqrt(distSq) || 0.01;
            const denom = dist + soften;
            const strength = (force / (denom * denom)) * dist;
            this.acceleration = this.acceleration.add(new Vector2D(dx / dist, dy / dist).scale(strength));
          }
        }
        super.update(dt, qt);
      }
    };
}

// ─── @WithFlocking ────────────────────────────────────────────
// Classic Reynolds boids algorithm:
//   separation — steer away from very close neighbors
//   alignment  — match average heading of neighbors
//   cohesion   — steer toward center of mass of neighbors

export function WithFlocking(
  perceptionRadius = 80,
  separationRadius = 30,
  weights = { sep: 1.8, align: 1.0, coh: 1.0 },
  maxForce = 300,
  maxSpeed = 180
) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      update(dt: number, qt?: QuadTree): void {
        if (qt) {
          const buf = this._state.queryBuffer as Particle[];
          buf.length = 0;
          qt.query(Rect.circle(this.position.x, this.position.y, perceptionRadius), buf);

          let sep = Vector2D.zero();
          let align = Vector2D.zero();
          let coh = Vector2D.zero();
          let sepCount = 0,
            flockCount = 0;

          for (const other of buf) {
            if (other === (this as unknown as Particle)) continue;
            const dx = this.position.x - other.position.x;
            const dy = this.position.y - other.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > perceptionRadius) continue;

            if (dist < separationRadius && dist > 0) {
              sep = sep.add(new Vector2D(dx, dy).scale(1 / dist));
              sepCount++;
            }
            align = align.add(other.velocity);
            coh = coh.add(other.position);
            flockCount++;
          }

          if (sepCount > 0) {
            const desired = sep
              .scale(1 / sepCount)
              .normalize()
              .scale(maxSpeed);
            sep = desired.sub(this.velocity).limit(maxForce);
          }
          if (flockCount > 0) {
            const desiredAlign = align
              .scale(1 / flockCount)
              .normalize()
              .scale(maxSpeed);
            align = desiredAlign.sub(this.velocity).limit(maxForce);

            const target = coh.scale(1 / flockCount);
            const desiredCoh = target.sub(this.position).normalize().scale(maxSpeed);
            coh = desiredCoh.sub(this.velocity).limit(maxForce);
          }

          this.acceleration = this.acceleration
            .add(sep.scale(weights.sep))
            .add(align.scale(weights.align))
            .add(coh.scale(weights.coh));

          const speed = this.velocity.mag();
          if (speed > maxSpeed) this.velocity = this.velocity.scale(maxSpeed / speed);
        }
        super.update(dt, qt);
      }
    };
}

// ─── @WithLinkDraw ────────────────────────────────────────────
// During render, queries _state.qt (cached by the last update call)
// and draws fading lines to nearby particles.
// Without the QuadTree this would be O(n²) per render frame.

export function WithLinkDraw(radius = 100, lineColor = 'rgba(150,180,255,1)', lineWidth = 0.8) {
  return <T extends ParticleCtor>(Base: T) =>
    class extends Base {
      render(ctx: CanvasRenderingContext2D): void {
        const qt = this._state.qt as QuadTree | undefined;
        const buf = this._state.queryBuffer as Particle[] | undefined;

        if (qt && buf) {
          buf.length = 0;
          qt.query(Rect.circle(this.position.x, this.position.y, radius), buf);

          ctx.save();
          ctx.lineWidth = lineWidth;
          for (const other of buf) {
            if (other === (this as unknown as Particle)) continue;
            const dx = other.position.x - this.position.x;
            const dy = other.position.y - this.position.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= radius) continue;

            ctx.globalAlpha = (1 - d / radius) * 0.55;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(other.position.x, other.position.y);
            ctx.stroke();
          }
          ctx.restore();
        }
        super.render(ctx);
      }
    };
}
