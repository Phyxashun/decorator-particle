// ════════════════════════════════════════════════════════
// Vector
// ════════════════════════════════════════════════════════
class Vector {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  public sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  public scale(s: number): Vector {
    return new Vector(this.x * s, this.y * s);
  }

  public clone(): Vector {
    return new Vector(this.x, this.y);
  }

  public mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public normalize(): Vector {
    const m = this.mag();
    return m > 0 ? this.scale(1 / m) : new Vector();
  }

  public limit(max: number): Vector {
    return this.mag() > max ? this.normalize().scale(max) : this.clone();
  }

  public static zero(): Vector {
    return new Vector(0, 0);
  }
}

export default Vector;
