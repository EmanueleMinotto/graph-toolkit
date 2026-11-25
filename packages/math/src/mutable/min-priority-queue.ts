export interface QueueEntry {
  readonly item: number;
  readonly priority: number;
}

/** Binary min-heap keyed by numeric priority. Duplicate items are allowed (lazy deletion). */
export class MinPriorityQueue {
  readonly #items: number[] = [];
  readonly #priorities: number[] = [];

  /** O(log n). */
  public push(item: number, priority: number): void {
    this.#items.push(item);
    this.#priorities.push(priority);
    this.#siftUp(this.#items.length - 1);
  }

  /** Removes and returns the entry with the lowest priority, O(log n). */
  public pop(): QueueEntry | undefined {
    const last = this.#items.length - 1;
    if (last < 0) return undefined;
    this.#swap(0, last);
    const entry = { item: this.#items.pop()!, priority: this.#priorities.pop()! };
    this.#siftDown(0);
    return entry;
  }

  public size(): number {
    return this.#items.length;
  }

  #siftUp(start: number): void {
    let index = start;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.#priorities[parent]! <= this.#priorities[index]!) return;
      this.#swap(parent, index);
      index = parent;
    }
  }

  #siftDown(start: number): void {
    let index = start;
    for (;;) {
      const smallest = this.#smallestOfFamily(index);
      if (smallest === index) return;
      this.#swap(smallest, index);
      index = smallest;
    }
  }

  #smallestOfFamily(index: number): number {
    let smallest = index;
    for (const child of [2 * index + 1, 2 * index + 2]) {
      if (child < this.#items.length && this.#priorities[child]! < this.#priorities[smallest]!) {
        smallest = child;
      }
    }
    return smallest;
  }

  #swap(left: number, right: number): void {
    [this.#items[left], this.#items[right]] = [this.#items[right]!, this.#items[left]!];
    [this.#priorities[left], this.#priorities[right]] = [
      this.#priorities[right]!,
      this.#priorities[left]!,
    ];
  }
}
