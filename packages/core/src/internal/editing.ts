import type { Attributes, Graph, VertexId } from '../types.js';

/** Edges as parallel arrays, one slot per edge in insertion order. */
export interface EdgeStore {
  readonly sources: number[];
  readonly targets: number[];
  readonly weights: number[];
  readonly attributes: (Attributes | undefined)[];
}

/** Keeps only the items whose flag is set, in place and in order. */
function compact(items: unknown[], keep: readonly boolean[]): void {
  let write = 0;

  for (let read = 0; read < items.length; read++) {
    if (keep[read] === true) {
      items[write++] = items[read];
    }
  }

  items.length = write;
}

/** Deletes the edges whose endpoints satisfy `shouldDrop`; returns how many went. */
export function dropEdges(
  store: EdgeStore,
  shouldDrop: (from: number, to: number) => boolean,
): number {
  const keep = store.sources.map((from, edge) => !shouldDrop(from, store.targets[edge]!));

  for (const list of [store.sources, store.targets, store.weights, store.attributes]) {
    compact(list, keep);
  }

  return keep.filter((kept) => !kept).length;
}

/** `[source, target]` of every edge, in insertion order. */
export function endpointPairs(store: EdgeStore): (readonly [number, number])[] {
  return store.sources.map((from, edge) => [from, store.targets[edge]!] as const);
}

/** Renumbers vertex indices after the vertex at `removed` is gone. */
export function shiftDown(indices: number[], removed: number): void {
  for (let position = 0; position < indices.length; position++) {
    if (indices[position]! > removed) {
      indices[position]!--;
    }
  }
}

/** Drops `removed` from the id → index map and closes the gap it leaves. */
export function removeIndex(indices: Map<VertexId, number>, id: VertexId): void {
  const removed = indices.get(id)!;

  indices.delete(id);

  for (const [other, index] of indices) {
    if (index > removed) {
      indices.set(other, index - 1);
    }
  }
}

/** Drops the attributes of vertex `removed` and renumbers the ones after it. */
export function removeAttributes(attributes: Map<number, Attributes>, removed: number): void {
  const kept = [...attributes].filter(([index]) => index !== removed);

  attributes.clear();

  for (const [index, value] of kept) {
    attributes.set(index > removed ? index - 1 : index, value);
  }
}

/** Whether some endpoint pair is joined by more than one edge (`edges()` lists undirected ones once, low end first). */
export function hasParallelEdges(graph: Graph): boolean {
  const seen = new Set<string>();

  for (const { source, target } of graph.edges()) {
    const key = `${graph.indexOf(source)}:${graph.indexOf(target)}`;

    if (seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}
