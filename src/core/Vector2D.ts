class Vector2D {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  public sub(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  public scale(s: number): Vector2D {
    return new Vector2D(this.x * s, this.y * s);
  }

  public clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  public mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public normalize(): Vector2D {
    const m = this.mag();
    return m > 0 ? this.scale(1 / m) : new Vector2D();
  }

  public limit(max: number): Vector2D {
    return this.mag() > max ? this.normalize().scale(max) : this.clone();
  }

  public static zero(): Vector2D {
    return new Vector2D(0, 0);
  }
}

export default Vector2D;
