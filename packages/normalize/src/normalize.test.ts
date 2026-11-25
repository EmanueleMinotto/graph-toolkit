import { GraphBuilder, GraphError, vertexId } from '@graph-sdk/core';
import { cycleGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { canonicalize, reindex, relabel, removeSelfLoops } from './index.js';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')] as const;

describe('normalize', () => {
  it('relabels and detects collisions', () => {
    const upper = relabel(cycleGraph(3), (id) => vertexId(`v${id}`));
    expect(upper.vertices()).toEqual(['v0', 'v1', 'v2']);
    expect(upper.hasEdge(vertexId('v2'), vertexId('v0'))).toBe(true);
    expect(() => relabel(cycleGraph(3), () => a)).toThrow(GraphError);
  });

  it('removes self loops', () => {
    const graph = new GraphBuilder().addVertex(a).addVertex(b).addEdge(a, a).addEdge(a, b).build();
    expect(removeSelfLoops(graph).edgeCount).toBe(1);
  });

  it('canonicalizes insertion order and endpoint order', () => {
    const left = new GraphBuilder()
      .addVertex(c)
      .addVertex(a)
      .addVertex(b)
      .addEdge(c, a, 2)
      .addEdge(b, a)
      .build();
    const right = new GraphBuilder()
      .addVertex(a)
      .addVertex(b)
      .addVertex(c)
      .addEdge(a, b)
      .addEdge(a, c, 2)
      .build();
    expect(canonicalize(left).vertices()).toEqual([a, b, c]);
    expect(canonicalize(left).edges()).toEqual(canonicalize(right).edges());
  });

  it('keeps arc direction in directed graphs', () => {
    const graph = new GraphBuilder({ directed: true })
      .addVertex(b)
      .addVertex(a)
      .addEdge(b, a)
      .build();
    expect(canonicalize(graph).edges()).toEqual([{ source: b, target: a, weight: 1 }]);
  });

  it('reindexes vertices to dense numeric ids', () => {
    const graph = new GraphBuilder().addVertex(c).addVertex(a).addEdge(c, a).build();
    expect(reindex(graph).vertices()).toEqual(['0', '1']);
  });
});
