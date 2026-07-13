export class RingBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private count: number = 0;

  constructor(public capacity: number) {
    this.buffer = new Array<T>(capacity);
  }

  push(item: T) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  get(index: number): T | undefined {
    if (index >= this.count || index < 0) return undefined;
    const actualIndex = (this.head - this.count + index + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }

  getLatest(): T | undefined {
    if (this.count === 0) return undefined;
    const actualIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }

  clear() {
    this.head = 0;
    this.count = 0;
    this.buffer = new Array<T>(this.capacity);
  }

  get length() {
    return this.count;
  }

  getItems(): T[] {
    const items: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const actualIndex = (this.head - this.count + i + this.capacity) % this.capacity;
      items.push(this.buffer[actualIndex]);
    }
    return items;
  }
}
