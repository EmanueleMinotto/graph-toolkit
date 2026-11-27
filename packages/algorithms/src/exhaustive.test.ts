import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  globalMinCut,
  isPlanar,
  kCores,
  maxFlow,
  maxFlowDinic,
  maximumMatching,
  minCut,
} from './index.js';

type Arc = readonly [number, number, number];
type Inside = (vertex: number) => boolean;

const SIZE = 8;
const VERTICES = Array.from({ length: SIZE }, (_, index) => index);

function weighted(seed: number, directed: boolean): Graph {
  const base = randomGraph(SIZE, { probability: 0.4, seed });
  const builder = new GraphBuilder({ directed });

  for (const id of base.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of base.edges().entries()) {
    const flip = directed && index % 3 === 0;
    const [from, to] = flip ? [edge.target, edge.source] : [edge.source, edge.target];

    builder.addEdge(from, to, 1 + ((index * 4 + Number(edge.target)) % 6));
  }

  return builder.build();
}

const arcsOf = (graph: Graph): Arc[] =>
  graph.edges().map((edge): Arc => [Number(edge.source), Number(edge.target), edge.weight]);

const pairsOf = (graph: Graph): (readonly [number, number])[] =>
  arcsOf(graph).map(([from, to]) => [from, to] as const);

/** Every subset of the eight vertices, as a membership predicate. */
const subsets: Inside[] = Array.from(
  { length: 2 ** SIZE },
  (_, mask): Inside =>
    (vertex) =>
      ((mask >> vertex) & 1) === 1,
);

const seeds = Array.from({ length: 30 }, (_, index) => 700 + index);

interface Pair {
  readonly got: unknown;
  readonly want: unknown;
}

const gots = (pairs: readonly Pair[]): unknown[] => pairs.map((pair) => pair.got);
const wants = (pairs: readonly Pair[]): unknown[] => pairs.map((pair) => pair.want);

describe('flows against the minimum cut by enumeration', () => {
  it('has the maximum flow equal to the cheapest cut', () => {
    const rows = seeds.map((seed) => {
      const graph = weighted(seed, true);
      const [source, sink] = [graph.vertices()[0]!, graph.vertices()[SIZE - 1]!];
      const arcs = arcsOf(graph);
      const cheapest = Math.min(
        ...subsets
          .filter((inside) => inside(0) && !inside(SIZE - 1))
          .map((inside) =>
            arcs.reduce(
              (sum, [from, to, weight]) => sum + (inside(from) && !inside(to) ? weight : 0),
              0,
            ),
          ),
      );

      return {
        want: cheapest,
        edmonds: maxFlow(graph, source, sink),
        dinic: maxFlowDinic(graph, source, sink),
        cut: minCut(graph, source, sink).value,
      };
    });

    expect(rows.map((row) => row.edmonds)).toEqual(rows.map((row) => row.want));
    expect(rows.map((row) => row.dinic)).toEqual(rows.map((row) => row.want));
    expect(rows.map((row) => row.cut)).toEqual(rows.map((row) => row.want));
  });
});

describe('global minimum cut by enumeration', () => {
  it('finds the lightest cut over all two-sided partitions', () => {
    const rows = seeds.map((seed) => {
      const graph = weighted(seed, false);
      const arcs = arcsOf(graph);
      const cheapest = Math.min(
        ...subsets
          .filter((inside) => inside(0) && VERTICES.some((vertex) => !inside(vertex)))
          .map((inside) =>
            arcs.reduce(
              (sum, [from, to, weight]) => sum + (inside(from) === inside(to) ? 0 : weight),
              0,
            ),
          ),
      );
      const found = globalMinCut(graph);

      return {
        got: found.value,
        want: cheapest,
        crossing: found.edges.reduce((sum, edge) => sum + edge.weight, 0),
      };
    });

    expect(gots(rows)).toEqual(wants(rows));
    expect(rows.map((row) => row.crossing)).toEqual(wants(rows));
  });
});

describe('k-cores by peeling', () => {
  const COUNT = 12;

  function peeledCore(pairs: readonly (readonly [number, number])[], vertex: number): number {
    const degreeIn = (alive: ReadonlySet<number>, item: number): number =>
      pairs.filter(([a, b]) => (a === item && alive.has(b)) || (b === item && alive.has(a))).length;
    let core = 0;

    for (let k = 1; k <= COUNT; k++) {
      let alive: ReadonlySet<number> = new Set(Array.from({ length: COUNT }, (_, index) => index));

      for (let round = 0; round < COUNT; round++) {
        alive = new Set([...alive].filter((item) => degreeIn(alive, item) >= k));
      }

      core = alive.has(vertex) ? k : core;
    }

    return core;
  }

  it('matches repeated removal of low-degree vertices', () => {
    const rows = seeds.map((seed) => {
      const graph = randomGraph(COUNT, { probability: 0.25, seed });
      const pairs = pairsOf(graph);

      return {
        got: [...kCores(graph).values()],
        want: Array.from({ length: COUNT }, (_, vertex) => peeledCore(pairs, vertex)),
      };
    });

    expect(gots(rows)).toEqual(wants(rows));
  });
});

function choose(items: readonly number[], size: number): number[][] {
  return size === 0
    ? [[]]
    : items.flatMap((item, index) =>
        choose(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]),
      );
}

/** Whether a six-vertex graph contains K5, K5 with one subdivided edge, or K3,3. */
function containsForbidden(graph: Graph): boolean {
  const all = [0, 1, 2, 3, 4, 5];
  const has = (left: number, right: number): boolean =>
    graph.hasEdge(graph.vertices()[left]!, graph.vertices()[right]!);
  const complete = (set: readonly number[], skip: readonly number[] = []): boolean =>
    choose(set, 2).every(
      (pair) => (pair[0] === skip[0] && pair[1] === skip[1]) || has(pair[0]!, pair[1]!),
    );
  const subdivided = (set: readonly number[]): boolean => {
    const [outside] = all.filter((vertex) => !set.includes(vertex)) as [number];

    return choose(set, 2).some(
      (pair) => complete(set, pair) && has(pair[0]!, outside) && has(outside, pair[1]!),
    );
  };
  const bipartite = (left: readonly number[]): boolean => {
    const right = all.filter((vertex) => !left.includes(vertex));

    return left.every((one) => right.every((other) => has(one, other)));
  };

  return (
    choose(all, 5).some((set) => complete(set) || subdivided(set)) ||
    choose(all, 3).some((left) => bipartite(left))
  );
}

describe('planarity of six-vertex graphs by forbidden subgraphs', () => {
  it('rejects exactly the graphs containing K5, a subdivided K5 or K3,3', () => {
    const rows = Array.from({ length: 60 }, (_, index) => 800 + index).map((seed) => {
      const graph = randomGraph(6, { probability: 0.45 + (seed % 6) * 0.08, seed });

      return { got: isPlanar(graph), want: !containsForbidden(graph) };
    });

    expect(gots(rows)).toEqual(wants(rows));
    expect(rows.some((row) => !row.got)).toBe(true);
    expect(rows.some((row) => row.got)).toBe(true);
  });
});

function best(pairs: readonly (readonly [number, number])[], used: ReadonlySet<number>): number {
  const [first, ...rest] = pairs;

  if (first === undefined) {
    return 0;
  }

  const skipped = best(rest, used);

  return used.has(first[0]) || used.has(first[1])
    ? skipped
    : Math.max(skipped, 1 + best(rest, new Set([...used, first[0], first[1]])));
}

describe('matching on larger sparse graphs', () => {
  it('matches exhaustive search where blossoms are common', () => {
    const rows = Array.from({ length: 40 }, (_, index) => 900 + index).map((seed) => {
      const graph = randomGraph(11, { probability: 0.2 + (seed % 3) * 0.05, seed });

      return { got: maximumMatching(graph).size, want: best(pairsOf(graph), new Set()) };
    });

    expect(gots(rows)).toEqual(wants(rows));
  });
});
