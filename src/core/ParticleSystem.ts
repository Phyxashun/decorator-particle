import Particle from './Particle';
import QuadTree from '../quadtree/QuadTree';
import Rect from '../quadtree/Rect';
import Point from '../quadtree/Point';

export type Bounds = { width: number; height: number };

class ParticleSystem {
  private particles: Particle[] = [];
  private qt: QuadTree;

  public bounds: Bounds;

  constructor(bounds: Bounds) {
    this.bounds = bounds;
    this.qt = this.makeTree(this.bounds);
  }

  // ── Particle management ──────────────────────────────────────

  add(p: Particle): this {
    this.particles.push(p);
    return this;
  }
  get count(): number {
    return this.particles.length;
  }
  clear(): void {
    this.particles = [];
  }

  /** Call after canvas resize so the root Rect stays current. */
  resize(bounds: { width: number; height: number }): void {
    this.bounds = bounds;
    this.qt = this.makeTree(bounds);
  }

  // ── Per-frame ────────────────────────────────────────────────

  update(dt: number): void {
    // 1. Rebuild QuadTree — O(n log n)
    this.qt.clear();
    for (const p of this.particles) {
      this.qt.insert(new Point(p.position.x, p.position.y, p));
    }

    // 2. Update each particle; pass tree so spatial decorators can query
    for (const p of this.particles) {
      p.update(dt, this.qt);
    }

    // 3. Prune dead particles
    this.particles = this.particles.filter((p) => p.isAlive);
  }

  render(ctx: CanvasRenderingContext2D, showQt = false): void {
    if (showQt) this.qt.draw(ctx);
    for (const p of this.particles) p.render(ctx);
  }

  // ── Accessors ────────────────────────────────────────────────

  get quadTree(): QuadTree {
    return this.qt;
  }
  get all(): Particle[] {
    return this.particles;
  }

  // ── Private ──────────────────────────────────────────────────

  private makeTree(bounds: { width: number; height: number }): QuadTree {
    return new QuadTree(
      new Rect(bounds.width / 2, bounds.height / 2, bounds.width / 2, bounds.height / 2),
      8, // node capacity
      8 // max depth
    );
  }
}

export default ParticleSystem;
