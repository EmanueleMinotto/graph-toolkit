import type { Graph, VertexId } from '@graph-sdk/core';
import {
  arbDag,
  arbGraph,
  BRUTE_FORCE,
  buildGraph,
  name,
  range,
  type WeightedPair,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  aStar,
  bellmanFord,
  dagShortestPaths,
  dijkstra,
  eulerianTrail,
  floydWarshall,
  hamiltonianCycle,
  hamiltonianPath,
  hasCycle,
  johnson,
  kShortestPaths,
  NegativeCycleError,
} from './index.js';

const byText = (left: string, right: string): number => left.localeCompare(right);
const byNumber = (left: number, right: number): number => left - right;
const arbDirection = fc.boolean();
const arbWeighted = arbDirection.chain((directed) =>
  arbGraph({ directed, weighted: true, allowSelfLoops: true, minN: 1, maxN: 6 }),
);

/** Cost of walking `path`, taking the cheapest parallel-free edge at each step; `undefined` if a step is missing. */
function walkCost(graph: Graph, path: readonly VertexId[]): number | undefined {
  const steps = path.slice(1).map((to, index) => graph.edgesBetween(path[index]!, to)[0]?.weight);

  return steps.includes(undefined)
    ? undefined
    : steps.reduce<number>((total, weight) => total + weight!, 0);
}

/** Floyd–Warshall written out here as the oracle (non-negative weights). */
function distances(graph: Graph): number[][] {
  const n = graph.vertexCount;
  const cells = range(n).map((from) => range(n).map((to) => (from === to ? 0 : Infinity)));
  const triples = range(n).flatMap((via) =>
    range(n).flatMap((from) => range(n).map((to): [number, number, number] => [via, from, to])),
  );

  for (const { source, target, weight } of graph.edges()) {
    const [from, to] = [graph.indexOf(source), graph.indexOf(target)];

    cells[from]![to] = Math.min(cells[from]![to]!, weight);
    cells[to]![from] = graph.directed ? cells[to]![from]! : Math.min(cells[to]![from]!, weight);
  }

  for (const [via, from, to] of triples) {
    cells[from]![to] = Math.min(cells[from]![to]!, cells[from]![via]! + cells[via]![to]!);
  }

  return cells;
}

/** The same edges with weights shifted down, so some are negative. */
const shifted = (graph: Graph, by: number): Graph =>
  buildGraph(
    graph.vertexCount,
    graph
      .edges()
      .map(({ source, target, weight }): WeightedPair => [
        Number(source),
        Number(target),
        weight - by,
      ]),
    { directed: true },
  );

/** Every simple path from `from` to `to` with its cost. */
function simplePaths(
  graph: Graph,
  from: VertexId,
  to: VertexId,
  seen: readonly VertexId[] = [],
): { path: VertexId[]; cost: number }[] {
  const here = [...seen, from];

  return from === to
    ? [{ path: here, cost: 0 }]
    : graph
        .neighbors(from)
        .filter((edge) => !here.includes(edge.target))
        .flatMap((edge) =>
          simplePaths(graph, edge.target, to, here).map(({ path, cost }) => ({
            path,
            cost: cost + edge.weight,
          })),
        );
}

const permutations = (items: readonly number[]): number[][] =>
  items.length === 0
    ? [[]]
    : items.flatMap((item) =>
        permutations(items.filter((other) => other !== item)).map((rest) => [item, ...rest]),
      );

describe('paths properties', () => {
  describe('shortest paths', () => {
    it('Dijkstra, Bellman–Ford, Floyd–Warshall and Johnson all agree with the oracle', () => {
      fc.assert(
        fc.property(arbWeighted, (graph) => {
          const wanted = distances(graph);
          const [fw, jo] = [floydWarshall(graph), johnson(graph)];

          for (const [row, from] of graph.vertices().entries()) {
            const [dj, bf] = [dijkstra(graph, from), bellmanFord(graph, from)];

            for (const [column, to] of graph.vertices().entries()) {
              expect(dj.distanceTo(to)).toBe(wanted[row]![column]);
              expect(bf.distanceTo(to)).toBe(wanted[row]![column]);
              expect(fw.distance(from, to)).toBe(wanted[row]![column]);
              expect(jo.distance(from, to)).toBe(wanted[row]![column]);
            }
          }
        }),
        BRUTE_FORCE,
      );
    });

    it('pathTo returns a real path whose cost is the distance, or undefined when unreachable', () => {
      fc.assert(
        fc.property(arbWeighted, (graph) => {
          const [source] = graph.vertices();
          const tree = dijkstra(graph, source!);

          for (const to of graph.vertices()) {
            const path = tree.pathTo(to);

            expect(path === undefined).toBe(tree.distanceTo(to) === Infinity);
            expect(path === undefined ? 0 : path[0]).toBe(path === undefined ? 0 : source);
            expect(path === undefined ? 0 : path.at(-1)).toBe(path === undefined ? 0 : to);

            expect(path === undefined ? 0 : walkCost(graph, path)).toBe(
              path === undefined ? 0 : tree.distanceTo(to),
            );
          }
        }),
      );
    });

    it('with negative weights on a DAG, DAG shortest paths, Bellman–Ford, Floyd–Warshall and Johnson agree', () => {
      fc.assert(
        fc.property(
          arbDag({ weighted: true, maxN: 6 }),
          fc.integer({ min: 0, max: 8 }),
          (dag, by) => {
            const graph = shifted(dag, by);
            const [fw, jo] = [floydWarshall(graph), johnson(graph)];

            for (const from of graph.vertices()) {
              const [dg, bf] = [dagShortestPaths(graph, from), bellmanFord(graph, from)];

              for (const to of graph.vertices()) {
                expect(dg.distanceTo(to)).toBe(bf.distanceTo(to));
                expect(fw.distance(from, to)).toBe(bf.distanceTo(to));
                expect(jo.distance(from, to)).toBe(bf.distanceTo(to));
              }
            }
          },
        ),
      );
    });

    it('a negative cycle is reported by every algorithm that can see it', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 4 }),
          (size, deficit) => {
            const ring = range(size).map((index): WeightedPair => [
              index,
              (index + 1) % size,
              index === 0 ? -size - deficit : 1,
            ]);
            const graph = buildGraph(size, ring, { directed: true });

            expect(() => bellmanFord(graph, name(0))).toThrow(NegativeCycleError);
            expect(() => floydWarshall(graph)).toThrow(NegativeCycleError);
            expect(() => johnson(graph)).toThrow(NegativeCycleError);
          },
        ),
      );
    });
  });

  describe('A* and k shortest paths', () => {
    it('A* with a zero heuristic finds the Dijkstra distance and a real path', () => {
      fc.assert(
        fc.property(arbWeighted, fc.nat(5), fc.nat(5), (graph, a, b) => {
          const [source, target] = [name(a % graph.vertexCount), name(b % graph.vertexCount)];
          const found = aStar(graph, { source, target, heuristic: () => 0 });
          const wanted = dijkstra(graph, source).distanceTo(target);

          expect(found === undefined).toBe(wanted === Infinity);
          expect(found?.distance ?? Infinity).toBe(wanted);

          expect(found === undefined ? 0 : walkCost(graph, found.path)).toBe(
            found === undefined ? 0 : wanted,
          );
        }),
        BRUTE_FORCE,
      );
    });

    it('A* with the exact remaining distance as heuristic still finds the optimum', () => {
      fc.assert(
        fc.property(arbWeighted, fc.nat(5), fc.nat(5), (graph, a, b) => {
          const [source, target] = [name(a % graph.vertexCount), name(b % graph.vertexCount)];
          const exact = (vertex: VertexId): number => dijkstra(graph, vertex).distanceTo(target);
          const found = aStar(graph, {
            source,
            target,
            heuristic: (vertex) => (exact(vertex) === Infinity ? 0 : exact(vertex)),
          });

          expect(found?.distance ?? Infinity).toBe(exact(source));
        }),
      );
    });

    it('kShortestPaths returns the cheapest simple paths, in order, matching exhaustive enumeration', () => {
      fc.assert(
        fc.property(
          arbWeighted,
          fc.nat(5),
          fc.nat(5),
          fc.integer({ min: 1, max: 5 }),
          (graph, a, b, count) => {
            const [source, target] = [name(a % graph.vertexCount), name(b % graph.vertexCount)];
            const found = kShortestPaths(graph, { source, target, count });
            const all = simplePaths(graph, source, target)
              .map(({ cost }) => cost)
              .toSorted(byNumber);

            expect(found.map(({ distance }) => distance)).toEqual(all.slice(0, count));
            expect(new Set(found.map(({ path }) => path.join('>'))).size).toBe(found.length);

            for (const { path, distance } of found) {
              expect(new Set(path).size).toBe(path.length);
              expect(walkCost(graph, path)).toBe(distance);
            }
          },
        ),
        BRUTE_FORCE,
      );
    });
  });

  describe('cycles and trails', () => {
    it('hasCycle agrees with repeatedly removing sources (directed) or counting edges per component (undirected)', () => {
      fc.assert(
        fc.property(arbWeighted, (graph) => {
          const n = graph.vertexCount;
          const loops = graph.edges().some(({ source, target }) => source === target);
          const pairs = graph
            .edges()
            .map(({ source, target }) => [graph.indexOf(source), graph.indexOf(target)] as const);
          const alive = new Set(range(n));

          for (let changed = true; changed;) {
            const free = [...alive].filter((vertex) =>
              pairs.every(([from, to]) => to !== vertex || !alive.has(from)),
            );

            for (const vertex of free) {
              alive.delete(vertex);
            }

            changed = free.length > 0;
          }

          const parent = range(n);
          const find = (x: number): number => (parent[x] === x ? x : find(parent[x]!));
          const closing = pairs.filter(([from, to]) => {
            const [a, b] = [find(from), find(to)];

            parent[a] = b;

            return a === b;
          });

          expect(hasCycle(graph)).toBe((graph.directed ? alive.size : closing.length) > 0);
          expect(!loops || hasCycle(graph)).toBe(true);
        }),
      );
    });

    it('a DAG has no cycle', () => {
      fc.assert(
        fc.property(arbDag({ maxN: 7 }), (dag) => {
          expect(hasCycle(dag)).toBe(false);
        }),
      );
    });

    it('an Eulerian trail uses every edge once, and exists exactly when the odd-degree and connectivity conditions hold', () => {
      fc.assert(
        fc.property(arbGraph({ directed: false, minN: 1, maxN: 6 }), (graph) => {
          const trail = eulerianTrail(graph);
          const odd = graph.vertices().filter((id) => graph.degree(id) % 2 === 1).length;
          const touched = new Set(graph.edges().flatMap(({ source, target }) => [source, target]));
          const parent = new Map<string, string>([...touched].map((id) => [id, id]));
          const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));

          for (const { source, target } of graph.edges()) {
            parent.set(find(source), find(target));
          }

          const connected = new Set([...touched].map((id) => find(id))).size <= 1;
          const exists = graph.edgeCount > 0 && connected && (odd === 0 || odd === 2);

          expect(trail !== undefined).toBe(exists);
          expect(trail?.length ?? graph.edgeCount + 1).toBe(graph.edgeCount + 1);

          const used = (trail ?? [])
            .slice(1)
            .map((to, index) => [trail![index]!, to].toSorted(byText).join('-'));

          expect(used.toSorted(byText)).toEqual(
            trail === undefined
              ? used
              : graph
                  .edges()
                  .map(({ source, target }) => [source, target].toSorted(byText).join('-'))
                  .toSorted(byText),
          );
        }),
        BRUTE_FORCE,
      );
    });

    it('Hamiltonian paths and cycles exist exactly when some ordering of the vertices follows edges', () => {
      fc.assert(
        fc.property(
          arbDirection.chain((directed) => arbGraph({ directed, minN: 1, maxN: 6 })),
          (graph) => {
            const n = graph.vertexCount;
            const linked = (order: readonly number[], close: boolean): boolean =>
              order.every((vertex, index) => {
                const next = order[index + 1] ?? (close ? order[0]! : undefined);

                return next === undefined || graph.hasEdge(name(vertex), name(next));
              });
            const orders = permutations(range(n));
            const path = hamiltonianPath(graph);
            const cycle = hamiltonianCycle(graph);

            expect(path !== undefined).toBe(orders.some((order) => linked(order, false)));
            expect(cycle !== undefined).toBe(n >= 3 && orders.some((order) => linked(order, true)));
            expect(new Set(path).size).toBe(path?.length ?? 0);
            expect(path === undefined || path.length === n).toBe(true);

            expect(
              cycle === undefined || (cycle.length === n && linked(cycle.map(Number), true)),
            ).toBe(true);

            expect(path === undefined || linked(path.map(Number), false)).toBe(true);
          },
        ),
        BRUTE_FORCE,
      );
    });
  });
});
