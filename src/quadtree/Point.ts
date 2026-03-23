import Particle from '../core/Particle';

class Point {
  public x: number;
  public y: number;
  public p: Particle;

  constructor(x: number, y: number, p: Particle) {
    this.x = x;
    this.y = y;
    this.p = p;
  }
}

export default Point;
