import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-toolkit/core';
import { cycleGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import { minimumSpanningArborescence } from './index.js';

const v = (index: number) => vertexId(String(index));

function digraph(count: number, arcs: readonly (readonly [number, number, number])[]): Graph {
  const builder = new GraphBuilder({ directed: true });
  for (let index = 0; index < count; index++) builder.addVertex(v(index));
  for (const [from, to, weight] of arcs) builder.addEdge(v(from), v(to), weight);
  return builder.build();
}

describe('minimumSpanningArborescence', () => {
  it('picks the cheapest incoming edges when they form a tree', () => {
    const result = minimumSpanningArborescence(
      digraph(3, [
        [0, 1, 1],
        [0, 2, 4],
        [1, 2, 2],
      ]),
      v(0),
    );
    expect(result?.totalWeight).toBe(3);
    expect(result?.edges).toHaveLength(2);
  });

  it('contracts a cycle of cheap edges', () => {
    // 1→2→3→1 is the cheapest cycle; the root must enter it once.
    const graph = digraph(4, [
      [0, 1, 10],
      [0, 2, 12],
      [1, 2, 1],
      [2, 3, 1],
      [3, 1, 1],
      [3, 0, 1],
    ]);
    const result = minimumSpanningArborescence(graph, v(0));
    expect(result?.totalWeight).toBe(12);
    expect(
      result?.edges
        .map((edge) => `${edge.source}>${edge.target}`)
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(['0>1', '1>2', '2>3']);
  });

  it('handles nested contractions', () => {
    const graph = digraph(5, [
      [0, 1, 5],
      [1, 2, 1],
      [2, 1, 1],
      [2, 3, 2],
      [3, 4, 1],
      [4, 3, 1],
      [1, 3, 9],
      [0, 4, 20],
    ]);
    expect(minimumSpanningArborescence(graph, v(0))?.totalWeight).toBe(5 + 1 + 2 + 1);
  });

  it('is undefined when a vertex is unreachable and ignores loops', () => {
    expect(
      minimumSpanningArborescence(
        digraph(3, [
          [0, 1, 1],
          [2, 2, 1],
        ]),
        v(0),
      ),
    ).toBeUndefined();
    expect(
      minimumSpanningArborescence(
        digraph(2, [
          [0, 0, 1],
          [0, 1, 3],
        ]),
        v(0),
      )?.totalWeight,
    ).toBe(3);
  });

  it('is undefined when an unreachable cycle only shows up after contraction', () => {
    expect(
      minimumSpanningArborescence(
        digraph(3, [
          [1, 2, 1],
          [2, 1, 1],
        ]),
        v(0),
      ),
    ).toBeUndefined();
  });

  it('rejects undirected graphs', () => {
    expect(() => minimumSpanningArborescence(cycleGraph(3), v(0))).toThrow(GraphError);
  });
});
