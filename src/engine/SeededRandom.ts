export class SeededRandom {
  private state: number;

  constructor(seed: number = 12345) {
    this.state = seed;
  }

  // Linear Congruential Generator (LCG)
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296; // Normalize to [0, 1)
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  setSeed(seed: number) {
    this.state = seed;
  }
}
