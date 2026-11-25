import { GraphBuilder, pathGraph, petersenGraph, vertexId, type Graph } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const v = (index: number) => vertexId(String(index));
const none = { from: undefined, to: undefined };
const from0 = { from: v(0), to: undefined };

function digraph(count: number, arcs: readonly (readonly [number, number, number])[]): Graph {
  const builder = new GraphBuilder({ directed: true });
  for (let index = 0; index < count; index++) builder.addVertex(v(index));
  for (const [from, to, weight] of arcs) builder.addEdge(v(from), v(to), weight);
  return builder.build();
}

describe('advanced analyses', () => {
  it('reports bridges, articulation points and blocks of a path', () => {
    expect(analyze('bridges', pathGraph(4), none).summary).toBe('3 bridges');
    expect(analyze('articulation', pathGraph(4), none).summary).toBe('2 articulation points');
    expect(analyze('blocks', pathGraph(4), none).summary).toBe('3 biconnected components');
    expect(analyze('bridges', pathGraph(2), none).summary).toBe('1 bridge');
  });

  it('ranks cores and clustering', () => {
    expect(analyze('k-cores', petersenGraph(), none).summary).toContain('Highest core');
    expect(analyze('clustering', petersenGraph(), none).summary).toBe('Average clustering 0');
    expect(analyze('k-cores', pathGraph(0), none).summary).toBe('Highest core: –');
  });

  it('measures diameter, radius and center', () => {
    const result = analyze('diameter', pathGraph(5), none);
    expect(result.summary).toBe('Diameter 4, radius 2');
    expect(result.table).toEqual([['center', '2']]);
  });

  it('finds a minimum cut and a general matching', () => {
    const network = digraph(4, [
      [0, 1, 3],
      [0, 2, 2],
      [1, 3, 2],
      [2, 3, 3],
    ]);
    const cut = analyze('min-cut', network, { from: v(0), to: v(3) });
    expect(cut.summary).toBe('Minimum cut 0 | 3 has capacity 4');
    expect(analyze('min-cut', network, none).summary).toBe('Pick source and sink.');
    expect(analyze('blossom', petersenGraph(), none).summary).toContain('size 5');
  });

  it('computes Johnson distances and DAG distances', () => {
    const dag = digraph(3, [
      [0, 1, 2],
      [1, 2, -1],
    ]);
    expect(analyze('johnson', dag, none).matrix?.rows[0]).toEqual([0, 2, 1]);
    expect(analyze('johnson', pathGraph(41), none).summary).toContain('too large');
    expect(analyze('dag-distances', dag, from0).table?.[2]).toEqual(['2', '1']);
    expect(analyze('dag-distances', dag, none).summary).toBe('Pick a start vertex.');
  });

  it('builds a minimum arborescence', () => {
    const graph = digraph(3, [
      [0, 1, 1],
      [0, 2, 4],
      [1, 2, 2],
    ]);
    expect(analyze('arborescence', graph, from0).summary).toBe('Minimum arborescence of weight 3');
    expect(analyze('arborescence', graph, { from: v(2), to: undefined }).summary).toContain(
      'unreachable',
    );
    expect(analyze('arborescence', graph, none).summary).toBe('Pick a root vertex.');
  });

  it('summarizes closure and spectrum', () => {
    expect(
      analyze(
        'transitive-closure',
        digraph(3, [
          [0, 1, 1],
          [1, 2, 1],
        ]),
        none,
      ).summary,
    ).toBe('The transitive closure has 3 arcs');
    const spectrum = analyze('spectrum', pathGraph(2), none);
    expect(spectrum.summary).toBe('Algebraic connectivity 2');
    expect(spectrum.table).toEqual([
      ['λ1', '-1'],
      ['λ2', '1'],
    ]);
  });
});
