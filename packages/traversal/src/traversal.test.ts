import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-toolkit/core';
import { describe, expect, it } from 'vitest';
import { bfs, connectedComponents, dfs, topologicalSort } from './index.js';

const ids = ['a', 'b', 'c', 'd', 'e'].map((name) => vertexId(name));
const [a, b, c, d, isolated] = ids as [
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
];

const build = (directed: boolean, edges: readonly (readonly [number, number])[]): Graph => {
  const builder = new GraphBuilder({ directed });
  for (const id of ids) builder.addVertex(id);
  for (const [from, to] of edges) builder.addEdge(ids[from]!, ids[to]!);
  return builder.build();
};

describe('traversal', () => {
  const tree = build(false, [
    [0, 1],
    [0, 2],
    [1, 3],
  ]);

  it('bfs visits level by level and stays in the component', () => {
    expect(bfs(tree, a)).toEqual([a, b, c, d]);
  });

  it('dfs visits depth first in insertion order', () => {
    expect(dfs(tree, a)).toEqual([a, b, d, c]);
  });

  it('dfs handles revisits through cycles', () => {
    const cycle = build(false, [
      [0, 1],
      [1, 2],
      [2, 0],
    ]);
    expect(dfs(cycle, a)).toEqual([a, b, c]);
  });

  it('connectedComponents splits the graph', () => {
    expect(connectedComponents(tree)).toEqual([[a, b, c, d], [isolated]]);
  });

  it('connectedComponents rejects directed graphs', () => {
    expect(() => connectedComponents(build(true, []))).toThrow(GraphError);
  });

  it('topologicalSort orders a DAG and rejects cycles', () => {
    const dag = build(true, [
      [0, 1],
      [1, 2],
      [0, 3],
    ]);
    const order = topologicalSort(dag)!;
    expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
    expect(order.indexOf(b)).toBeLessThan(order.indexOf(c));
    const diamond = build(true, [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(topologicalSort(diamond)).toHaveLength(5);
    const cyclic = build(true, [
      [0, 1],
      [1, 0],
    ]);
    expect(topologicalSort(cyclic)).toBeUndefined();
  });
});
