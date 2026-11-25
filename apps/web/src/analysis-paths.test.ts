import {
  completeGraph,
  cycleGraph,
  dijkstra,
  GraphBuilder,
  pathGraph,
  randomGraph,
  starGraph,
  vertexId,
} from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const [zero, one, two] = [vertexId('0'), vertexId('1'), vertexId('2')];
const from = (id: ReturnType<typeof vertexId>) => ({ from: id, to: undefined });
const between = (a: ReturnType<typeof vertexId>, b: ReturnType<typeof vertexId>) => ({
  from: a,
  to: b,
});
const none = { from: undefined, to: undefined };

const negative = () =>
  new GraphBuilder({ directed: true })
    .addVertex(zero)
    .addVertex(one)
    .addVertex(two)
    .addEdge(zero, one, 4)
    .addEdge(one, two, -2)
    .build();

describe('path analyses', () => {
  it('lists distances from a vertex, including unreachable ones', () => {
    const split = new GraphBuilder()
      .addVertex(zero)
      .addVertex(one)
      .addVertex(two)
      .addEdge(zero, one, 3)
      .build();
    const result = analyze('distances', split, from(zero));
    expect(result.table).toEqual([
      ['0', '0'],
      ['1', '3'],
      ['2', '∞'],
    ]);
    expect(result.summary).toContain('2 of 3');
    expect(result.edges.size).toBe(1);
    expect(analyze('distances', split, none).summary).toContain('Pick');
  });

  it('handles negative weights with Bellman-Ford and rejects them in Dijkstra', () => {
    expect(analyze('bellman-ford', negative(), from(zero)).table?.at(-1)).toEqual(['2', '2']);
    expect(analyze('distances', negative(), from(zero)).summary).toContain('non-negative');
    const loop = new GraphBuilder({ directed: true })
      .addVertex(zero)
      .addVertex(one)
      .addEdge(zero, one, -1)
      .addEdge(one, zero, -1)
      .build();
    expect(analyze('bellman-ford', loop, from(zero)).summary).toContain('Negative cycle');
  });

  it('computes all pairs and caps the table', () => {
    const small = analyze('floyd-warshall', pathGraph(3), none);
    expect(small.table).toContainEqual(['0 → 2', '2']);
    const big = analyze('floyd-warshall', completeGraph(30), none);
    expect(big.table).toHaveLength(500);
    expect(big.summary).toContain('870 ordered pairs, first 500 shown');
  });

  it('finds the same distance with A* as with Dijkstra', () => {
    const graph = randomGraph(40, { probability: 0.1, seed: 5 });
    const [source, ...others] = graph.vertices();
    const tree = dijkstra(graph, source!);
    for (const target of others.slice(0, 10)) {
      const result = analyze('astar', graph, between(source!, target));
      const expected = tree.distanceTo(target);
      expect(result.summary).toContain(
        expected === Infinity ? 'Unreachable' : `distance ${expected} `,
      );
    }
    expect(analyze('astar', graph, from(source!)).summary).toContain('Pick');
  });

  it('works in directed graphs and without edges for A*', () => {
    expect(
      analyze('astar', cycleGraph(5, { directed: true }), between(zero, vertexId('4'))).summary,
    ).toContain('distance 4');
    expect(
      analyze(
        'astar',
        new GraphBuilder().addVertex(zero).addVertex(one).build(),
        between(zero, one),
      ).summary,
    ).toBe('Unreachable.');
  });

  it('lists k shortest paths, cheapest first', () => {
    const result = analyze('k-shortest', cycleGraph(4), { ...between(zero, two), count: 5 });
    expect(result.table?.map(([, path]) => path)).toEqual(['0 → 1 → 2', '0 → 3 → 2']);
    expect(result.summary).toBe('2 loopless paths, best 2');
    expect(
      analyze('k-shortest', cycleGraph(4), { ...between(zero, two), count: 1 }).summary,
    ).toContain('1 loopless path,');
    expect(analyze('k-shortest', cycleGraph(4), between(zero, two)).table).toHaveLength(2);
    const split = new GraphBuilder().addVertex(zero).addVertex(one).build();
    expect(analyze('k-shortest', split, between(zero, one)).summary).toBe('Unreachable.');
    expect(analyze('k-shortest', split, from(zero)).summary).toContain('Pick');
  });

  it('finds Eulerian and Hamiltonian trails or reports none', () => {
    expect(analyze('eulerian', pathGraph(4), none).table).toHaveLength(4);
    expect(analyze('eulerian', starGraph(5), none).summary).toBe('No Eulerian trail.');
    expect(analyze('hamiltonian-path', pathGraph(4), none).summary).toBe('Hamiltonian path found');
    expect(analyze('hamiltonian-cycle', cycleGraph(5), none).table).toHaveLength(5);
    expect(analyze('hamiltonian-cycle', pathGraph(4), none).summary).toBe('No Hamiltonian cycle.');
  });
});
