import { GraphBuilder, GraphError, vertexId } from '@graph-sdk/core';
import { pathGraph, randomGraph, starGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { approximateBetweenness, betweennessCentrality } from './index.js';

describe('approximateBetweenness', () => {
  it('is exact when every vertex is a pivot', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer(), (count, seed) => {
        const graph = randomGraph(count, { probability: 0.4, seed });

        expect(approximateBetweenness(graph, { samples: count, seed })).toEqual(
          betweennessCentrality(graph),
        );
      }),
    );
  });

  it('is reproducible for a seed and varies with it', () => {
    const graph = randomGraph(40, { probability: 0.1, seed: 3 });
    const first = approximateBetweenness(graph, { samples: 5, seed: 1 });

    expect(approximateBetweenness(graph, { samples: 5, seed: 1 })).toEqual(first);
    expect(approximateBetweenness(graph, { samples: 5, seed: 2 })).not.toEqual(first);
  });

  it('ranks the hub of a star first with default options', () => {
    const graph = starGraph(100);
    const scores = approximateBetweenness(graph, { samples: 20 });
    const [hub, ...leaves] = graph.vertices();

    expect(scores.get(hub!)).toBeGreaterThan(Math.max(...leaves.map((id) => scores.get(id)!)));
    expect(approximateBetweenness(pathGraph(3)).get(vertexId('1'))).toBe(1);
  });

  it('handles directed and empty graphs', () => {
    const directed = new GraphBuilder({ directed: true })
      .addVertex(vertexId('a'))
      .addVertex(vertexId('b'))
      .addVertex(vertexId('c'))
      .addEdge(vertexId('a'), vertexId('b'))
      .addEdge(vertexId('b'), vertexId('c'))
      .build();

    expect(approximateBetweenness(directed).get(vertexId('b'))).toBe(1);
    expect(approximateBetweenness(new GraphBuilder().build()).size).toBe(0);
  });

  it('rejects invalid sample counts', () => {
    const graph = pathGraph(3);

    expect(() => approximateBetweenness(graph, { samples: 0 })).toThrow(GraphError);
    expect(() => approximateBetweenness(graph, { samples: 1.5 })).toThrow(GraphError);
  });
});
