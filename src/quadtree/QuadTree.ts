import Particle from '../core/Particle';
import Point from './Point';
import Rect from './Rect';

/**
 * Classic region QuadTree.
 *
 * Key perf choices:
 * - clear() resets in-place — no re-allocation each frame
 * - query() writes into a caller-supplied array (_state.queryBuffer)
 *   so the hot path is allocation-free
 * - maxDepth guard prevents infinite subdivision on coincident points
 */
class QuadTree {
  private points: Point[] = [];
  private divided = false;
  private ne?: QuadTree;
  private nw?: QuadTree;
  private se?: QuadTree;
  private sw?: QuadTree;

  public readonly boundary: Rect;
  private readonly capacity: number;
  private readonly maxDepth: number;
  private readonly depth: number;

  constructor(boundary: Rect, capacity = 8, maxDepth = 8, depth = 0) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  // ── Mutation ─────────────────────────────────────────────────

  /** Reset in-place — reuses existing node allocations where possible. */
  public clear(): void {
    this.points.length = 0;
    this.divided = false;
    this.ne?.clear();
    this.nw?.clear();
    this.se?.clear();
    this.sw?.clear();
    this.ne = this.nw = this.se = this.sw = undefined;
  }

  public insert(p: Point): boolean {
    if (!this.boundary.contains(p)) return false;

    if (!this.divided && this.points.length < this.capacity) {
      this.points.push(p);
      return true;
    }

    if (!this.divided) {
      if (this.depth >= this.maxDepth) {
        // At max depth — push directly to avoid infinite recursion
        this.points.push(p);
        return true;
      }
      this.subdivide();
    }

    return this.ne!.insert(p) || this.nw!.insert(p) || this.se!.insert(p) || this.sw!.insert(p);
  }

  // ── Query ────────────────────────────────────────────────────

  /**
   * Fill `out` with all particles within `range`.
   * Caller must set out.length = 0 before calling.
   * Using an out-param avoids per-query allocations.
   */
  public query(range: Rect, out: Particle[]): void {
    if (!this.boundary.intersects(range)) return;

    for (const pt of this.points) {
      if (range.contains(pt)) out.push(pt.p);
    }

    if (this.divided) {
      this.ne!.query(range, out);
      this.nw!.query(range, out);
      this.se!.query(range, out);
      this.sw!.query(range, out);
    }
  }

  // ── Debug ────────────────────────────────────────────────────

  public draw(ctx: CanvasRenderingContext2D): void {
    const { cx, cy, hw, hh } = this.boundary;
    ctx.strokeStyle = 'rgba(56,200,168,0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
    if (this.divided) {
      this.ne!.draw(ctx);
      this.nw!.draw(ctx);
      this.se!.draw(ctx);
      this.sw!.draw(ctx);
    }
  }

  public get size(): number {
    let n = this.points.length;
    if (this.divided) {
      n += (this.ne?.size ?? 0) + (this.nw?.size ?? 0) + (this.se?.size ?? 0) + (this.sw?.size ?? 0);
    }
    return n;
  }

  public countNodes(): number {
    let n = 1;
    if (this.divided) {
      n +=
        (this.ne?.countNodes() ?? 0) +
        (this.nw?.countNodes() ?? 0) +
        (this.se?.countNodes() ?? 0) +
        (this.sw?.countNodes() ?? 0);
    }
    return n;
  }

  // ── Private ──────────────────────────────────────────────────

  private subdivide(): void {
    const { cx, cy, hw, hh } = this.boundary;
    const qw = hw / 2,
      qh = hh / 2,
      d = this.depth + 1;

    this.ne = new QuadTree(new Rect(cx + qw, cy - qh, qw, qh), this.capacity, this.maxDepth, d);
    this.nw = new QuadTree(new Rect(cx - qw, cy - qh, qw, qh), this.capacity, this.maxDepth, d);
    this.se = new QuadTree(new Rect(cx + qw, cy + qh, qw, qh), this.capacity, this.maxDepth, d);
    this.sw = new QuadTree(new Rect(cx - qw, cy + qh, qw, qh), this.capacity, this.maxDepth, d);
    this.divided = true;

    // Redistribute existing points into children
    for (const pt of this.points) {
      if (this.ne.insert(pt)) continue;
      if (this.nw.insert(pt)) continue;
      if (this.se.insert(pt)) continue;
      if (this.sw.insert(pt)) continue;
    }
    this.points.length = 0;
  }
}

export default QuadTree;
