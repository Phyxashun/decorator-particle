/* eslint-disable @typescript-eslint/no-explicit-any */
import Vector2D from './Vector2D';
import type QuadTree from '../quadtree/QuadTree';

/**
 * Per-instance state bag shared across all decorator layers.
 * Because @decorators compose through prototype chains rather than
 * holding references to each other, cross-decorator communication
 * (e.g. WithFade reading WithLifetime's age) flows through here.
 */
export interface ParticleState {
  age?: number;
  maxAge?: number;
  angle?: number;
  history?: Vector2D[];
  radius?: number;
  qt?: QuadTree; // current frame's tree, set by update()
  queryBuffer?: Particle[]; // pre-allocated — never reallocated after WithSize init
  [key: string]: unknown;
}

/**
 * Base Particle — physics only.
 * position, velocity, acceleration + Euler integration.
 * Every other characteristic is applied via a decorator.
 */
class Particle {
  _state: ParticleState = {};
  public position: Vector2D;
  public velocity: Vector2D;
  public acceleration: Vector2D;

  constructor(position: Vector2D, velocity: Vector2D, acceleration: Vector2D = Vector2D.zero()) {
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
  }

  get isAlive(): boolean {
    return true;
  }

  /**
   * Integrate physics.
   * The quadtree built by ParticleSystem is passed in each frame
   * so spatial decorators can query neighbors without O(n²) iteration.
   */
  update(dt: number, qt?: QuadTree): void {
    if (qt) this._state.qt = qt;
    this.velocity = this.velocity.add(this.acceleration.scale(dt));
    this.position = this.position.add(this.velocity.scale(dt));
    this.acceleration = Vector2D.zero();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const r = this._state.radius ?? 4;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default Particle;
/** Convenience type used by all decorator factories. */
export type ParticleCtor<T extends Particle = Particle> = new (...args: any[]) => T;
