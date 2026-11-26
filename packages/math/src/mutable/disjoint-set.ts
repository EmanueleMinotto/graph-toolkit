/** Union-find over `0..size-1` with union by rank and path compression, ~O(α(n)) per op. */
export class DisjointSet {
  readonly #parent: Uint32Array;
  readonly #rank: Uint8Array;
  #sets: number;

  public constructor(size: number) {
    this.#parent = Uint32Array.from({ length: size }, (_, index) => index);
    this.#rank = new Uint8Array(size);
    this.#sets = size;
  }

  public find(element: number): number {
    let root = element;
    while (this.#parent[root] !== root) {
      root = this.#parent[root]!;
    }
    let node = element;
    while (this.#parent[node] !== root) {
      const next = this.#parent[node]!;
      this.#parent[node] = root;
      node = next;
    }
    return root;
  }

  /** Merges the sets of `left` and `right`; returns false when already joined. */
  public union(left: number, right: number): boolean {
    const [low, high] = this.#byRank(this.find(left), this.find(right));
    if (low === high) {
      return false;
    }
    this.#parent[low] = high;
    if (this.#rank[low] === this.#rank[high]) {
      this.#rank[high]!++;
    }
    this.#sets--;
    return true;
  }

  public setCount(): number {
    return this.#sets;
  }

  #byRank(first: number, second: number): [number, number] {
    return this.#rank[first]! <= this.#rank[second]! ? [first, second] : [second, first];
  }
}
