import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { areIsomorphic, graphEditDistance } from './index.js';

type Pair = readonly [number, number];

const name = (index: number) => vertexId(String(index));

function build(count: number, pairs: readonly Pair[], directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to] of pairs) {
    builder.addEdge(name(from), name(to));
  }

  return builder.build();
}

const pairsOf = (graph: Graph): Pair[] =>
  graph.edges().map((edge): Pair => [Number(edge.source), Number(edge.target)]);

const orient = (pairs: readonly Pair[]): Pair[] =>
  pairs.map(([from, to], index): Pair => (index % 2 === 0 ? [from, to] : [to, from]));

function permutations(items: readonly number[]): number[][] {
  return items.length === 0
    ? [[]]
    : items.flatMap((item) =>
        permutations(items.filter((other) => other !== item)).map((rest) => [item, ...rest]),
      );
}

const key = (directed: boolean, from: number, to: number): string =>
  directed || from <= to ? `${from}:${to}` : `${to}:${from}`;

const edgeSet = (pairs: readonly Pair[], directed: boolean): Set<string> =>
  new Set(pairs.map(([from, to]) => key(directed, from, to)));

/** Isomorphism by trying every vertex permutation. */
function bruteIsomorphic(
  count: number,
  sides: readonly [readonly Pair[], readonly Pair[]],
  directed: boolean,
): boolean {
  const [left, right] = sides;
  const target = edgeSet(right, directed);
  const source = edgeSet(left, directed);

  return (
    source.size === target.size &&
    permutations(Array.from({ length: count }, (_, index) => index)).some((mapping) =>
      left.every(([from, to]) => target.has(key(directed, mapping[from]!, mapping[to]!))),
    )
  );
}

const seeds = Array.from({ length: 24 }, (_, index) => 600 + index);

describe('isomorphism against permutation search', () => {
  it.each([false, true])('agrees on unrelated random graphs (directed: %s)', (directed) => {
    const results = seeds.map((seed) => {
      const left = pairsOf(randomGraph(6, { probability: 0.4, seed }));
      const right = pairsOf(randomGraph(6, { probability: 0.4, seed: seed + 1000 }));
      const [leftPairs, rightPairs] = directed ? [orient(left), orient(right)] : [left, right];

      return [
        areIsomorphic(build(6, leftPairs, directed), build(6, rightPairs, directed)),
        bruteIsomorphic(6, [leftPairs, rightPairs], directed),
      ];
    });

    expect(results.map(([got]) => got)).toEqual(results.map(([, want]) => want));
  });

  it.each([false, true])('recognises relabelled copies (directed: %s)', (directed) => {
    const answers = seeds.map((seed) => {
      const base = pairsOf(randomGraph(7, { probability: 0.4, seed }));
      const pairs = directed ? orient(base) : base;
      const shuffle = permutations([0, 1, 2, 3, 4, 5, 6])[(seed * 37) % 5040]!;
      const moved = pairs.map(([from, to]): Pair => [shuffle[from]!, shuffle[to]!]);

      return areIsomorphic(build(7, pairs, directed), build(7, moved, directed));
    });

    expect(answers.every(Boolean)).toBe(true);
  });

  it('sees a single moved edge', () => {
    const base = pairsOf(randomGraph(7, { probability: 0.4, seed: 640 }));
    const same = build(7, base, false);
    const different = build(7, [...base.slice(1), [0, 0]], false);

    expect(areIsomorphic(same, different)).toBe(false);
  });
});

describe('edit distance against its definition on tiny graphs', () => {
  it('counts the vertices and edges that differ under the best relabelling', () => {
    const results = seeds.map((seed) => {
      const left = pairsOf(randomGraph(4, { probability: 0.5, seed }));
      const right = pairsOf(randomGraph(4, { probability: 0.5, seed: seed + 2000 }));
      const best = Math.min(
        ...permutations([0, 1, 2, 3]).map((mapping) => {
          const moved = edgeSet(
            left.map(([from, to]): Pair => [mapping[from]!, mapping[to]!]),
            false,
          );
          const wanted = edgeSet(right, false);
          const shared = [...moved].filter((item) => wanted.has(item)).length;

          return moved.size + wanted.size - 2 * shared;
        }),
      );

      return [graphEditDistance(build(4, left, false), build(4, right, false)), best];
    });

    expect(results.map(([got]) => got)).toEqual(results.map(([, want]) => want));
  });
});
