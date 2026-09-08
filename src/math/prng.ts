/**
 * Deterministic PRNG using Mulberry32 algorithm
 */
export class PRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = Math.floor(seed) >>> 0;
  }

  public setSeed(seed: number): void {
    this.state = Math.floor(seed) >>> 0;
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max]
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a symmetric variation in [-spread, spread]
   */
  public spread(center: number, spread: number): number {
    return center + (this.next() * 2 - 1) * spread;
  }

  /**
   * Returns boolean with probability p in [0, 1]
   */
  public chance(p: number): number | boolean {
    return this.next() < p;
  }
}
