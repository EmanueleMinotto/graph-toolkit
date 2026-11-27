import { GraphBuilder, vertexId, type Graph, type VertexId } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  minimumSpanningArborescence,
  pruferCode,
  RootedTree,
  treeFromPruferCode,
} from './index.js';

interface Arc {
  readonly from: number;
  readonly to: number;
  readonly weight: number;
}

function directed(seed: number): Graph {
  const base = randomGraph(6, { probability: 0.55, seed });
  const builder = new GraphBuilder({ directed: true });

  for (const id of base.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of base.edges().entries()) {
    const [from, to] = index % 2 === 0 ? [edge.source, edge.target] : [edge.target, edge.source];

    builder.addEdge(from, to, 1 + ((index * 3 + Number(to)) % 7));
  }

  return builder.build();
}

const arcsOf = (graph: Graph): Arc[] =>
  graph.edges().map((edge) => ({
    from: Number(edge.source),
    to: Number(edge.target),
    weight: edge.weight,
  }));

/** Whether following the chosen parents from every vertex reaches vertex 0. */
const reachesRoot = (parent: readonly (Arc | undefined)[]): boolean =>
  parent.every((_, vertex) => {
    let current = vertex;

    for (let step = 0; current !== 0 && step < parent.length; step++) {
      current = parent[current]?.from ?? 0;
    }

    return current === 0;
  });

/** Cheapest way to give every non-root vertex one incoming arc such that all reach the root. */
function bestArborescence(arcs: readonly Arc[], count: number): number {
  const choose = (vertex: number, parent: (Arc | undefined)[]): number => {
    if (vertex === count) {
      return reachesRoot(parent)
        ? parent.reduce((sum, arc) => sum + (arc?.weight ?? 0), 0)
        : Infinity;
    }

    const options = arcs.filter((arc) => arc.to === vertex);

    return Math.min(Infinity, ...options.map((arc) => choose(vertex + 1, [...parent, arc])));
  };

  return choose(1, [undefined]);
}

const seeds = Array.from({ length: 30 }, (_, index) => 500 + index);

describe('minimum arborescence against exhaustive search', () => {
  it('matches the cheapest valid choice of incoming arcs', () => {
    const results = seeds.map((seed) => {
      const graph = directed(seed);
      const found = minimumSpanningArborescence(graph, graph.vertices()[0]!);

      return [found?.totalWeight ?? Infinity, bestArborescence(arcsOf(graph), 6)];
    });

    expect(results.map(([got]) => got)).toEqual(results.map(([, want]) => want));
    expect(results.some(([got]) => got !== Infinity)).toBe(true);
  });

  it('returns edges that really form a spanning arborescence', () => {
    for (const seed of seeds) {
      const graph = directed(seed);
      const found = minimumSpanningArborescence(graph, graph.vertices()[0]!);
      const targets = (found?.edges ?? []).map((edge) => edge.target);

      expect(new Set(targets).size).toBe(targets.length);
      expect(targets).not.toContain(graph.vertices()[0]);
      expect(targets).toHaveLength(found === undefined ? 0 : 5);
    }
  });
});

describe('rooted trees against parent pointers', () => {
  const ids = Array.from({ length: 14 }, (_, index) => vertexId(String(index)));

  it('computes depths and ancestors like a naive walk', () => {
    for (const seed of [3, 4, 5, 6, 7, 8]) {
      const code = Array.from(
        { length: 12 },
        (_, index) => ids[(seed * (index + 2) + index * 5) % 14]!,
      );
      const tree = treeFromPruferCode(ids, code);
      const rooted = new RootedTree(tree, ids[seed]!);
      const chain = (vertex: VertexId): VertexId[] => {
        const parent = rooted.parentOf(vertex);

        return parent === undefined ? [vertex] : [vertex, ...chain(parent)];
      };
      const naive = (left: VertexId, right: VertexId): VertexId => {
        const above = new Set(chain(left));

        return chain(right).find((candidate) => above.has(candidate))!;
      };
      const pairs = ids.flatMap((left) => ids.map((right) => [left, right] as const));

      expect(pruferCode(tree)).toEqual(code);
      expect(ids.map((id) => rooted.depthOf(id))).toEqual(ids.map((id) => chain(id).length - 1));

      expect(pairs.map(([left, right]) => rooted.lowestCommonAncestor(left, right))).toEqual(
        pairs.map(([left, right]) => naive(left, right)),
      );
    }
  });
});
