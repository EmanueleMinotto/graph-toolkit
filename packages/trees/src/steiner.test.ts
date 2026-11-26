import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { prune } from './internal/steiner.js';
import { steinerTree } from './index.js';

const v = (name: string) => vertexId(name);

function build(
  links: readonly (readonly [string, string, number])[],
  extra: readonly string[] = [],
): Graph {
  const builder = new GraphBuilder({ directed: false });
  const names = new Set([...links.flatMap(([a, b]) => [a, b]), ...extra]);
  for (const name of names) {
    builder.addVertex(v(name));
  }
  for (const [a, b, w] of links) {
    builder.addEdge(v(a), v(b), w);
  }
  return builder.build();
}

describe('steinerTree', () => {
  // A hub "h" reaches a, b, c at cost 1 each; the terminals are also joined directly at cost 3.
  const star = build([
    ['h', 'a', 1],
    ['h', 'b', 1],
    ['h', 'c', 1],
    ['a', 'b', 3],
    ['b', 'c', 3],
    ['a', 'c', 3],
  ]);

  it('uses a Steiner vertex when it is cheaper than joining terminals directly', () => {
    const tree = steinerTree(star, [v('a'), v('b'), v('c')]);
    expect(tree?.totalWeight).toBe(3);
    expect(tree?.edges).toHaveLength(3);
  });

  it('degenerates to a single vertex, a path and the spanning tree', () => {
    expect(steinerTree(star, [v('a')])).toEqual({ edges: [], totalWeight: 0 });
    expect(steinerTree(star, [v('a'), v('b'), v('a')])?.totalWeight).toBe(2);
    expect(steinerTree(cycleGraph(5), cycleGraph(5).vertices())?.totalWeight).toBe(4);
  });

  it('prunes branches that lead to no terminal', () => {
    const graph = build([
      ['a', 'b', 1],
      ['b', 'c', 1],
      ['c', 'd', 1],
      ['b', 'x', 1],
    ]);
    expect(steinerTree(graph, [v('a'), v('c')])?.totalWeight).toBe(2);
  });

  it('is undefined for disconnected terminals and rejects bad input', () => {
    expect(steinerTree(build([['a', 'b', 1]], ['z']), [v('a'), v('z')])).toBeUndefined();
    expect(() => steinerTree(cycleGraph(3, { directed: true }), [v('0')])).toThrow(GraphError);
    expect(() => steinerTree(build([['a', 'b', -1]]), [v('a')])).toThrow(GraphError);
  });
});

describe('prune', () => {
  it('drops non-terminal leaves repeatedly', () => {
    const edge = (source: string, target: string) => ({
      source: v(source),
      target: v(target),
      weight: 1,
    });
    const kept = prune(
      [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e')],
      new Set([v('a'), v('c')]),
    );
    expect(kept.map((item) => `${item.source}${item.target}`)).toEqual(['ab', 'bc']);
  });
});
