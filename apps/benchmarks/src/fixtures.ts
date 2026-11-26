import { GraphBuilder, vertexId, type Graph } from 'graph-toolkit';

export interface Size {
  readonly vertices: number;
  readonly edges: number;
}

/** Deterministic xorshift32 in [0, 1). */
function prng(seed: number): () => number {
  let state = seed >>> 0 || 1;

  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;

    return state / 4_294_967_296;
  };
}

/** Random simple graph with unit-ish weights; connected via a spanning path first. */
export function randomWeighted(size: Size, isDirected: boolean): Graph {
  const next = prng(12_345);
  const builder = new GraphBuilder({ directed: isDirected });
  const name = (index: number) => vertexId(`n${index}`);

  for (let index = 0; index < size.vertices; index++) {
    builder.addVertex(name(index));
  }

  const seen = new Set<number>();
  const add = (from: number, to: number): void => {
    const key = isDirected
      ? from * size.vertices + to
      : Math.min(from, to) * size.vertices + Math.max(from, to);

    if (from === to || seen.has(key)) {
      return;
    }

    seen.add(key);
    builder.addEdge(name(from), name(to), 1 + Math.floor(next() * 9));
  };

  for (let index = 1; index < size.vertices; index++) {
    add(index - 1, index);
  }

  while (seen.size < size.edges) {
    add(Math.floor(next() * size.vertices), Math.floor(next() * size.vertices));
  }

  return builder.build();
}

export const LARGE: Size = { vertices: 100_000, edges: 400_000 };
