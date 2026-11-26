import { GraphBuilder, GraphError, vertexId } from '@graph-sdk/core';
import { pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { randomWalks, spectralEmbedding } from './index.js';

describe('randomWalks', () => {
  it('follows edges, starts every vertex, and honours length and walk count', () => {
    const graph = pathGraph(5);
    const walks = randomWalks(graph, { walksPerVertex: 3, length: 6, seed: 7 });

    expect(walks).toHaveLength(15);
    expect(walks.map(([start]) => start)).toEqual(graph.vertices().flatMap((id) => [id, id, id]));

    for (const walk of walks) {
      expect(walk).toHaveLength(6);

      for (const [index, id] of walk.slice(1).entries()) {
        expect(graph.hasEdge(walk[index]!, id)).toBe(true);
      }
    }
  });

  it('is deterministic per seed', () => {
    const graph = starGraph(6);

    expect(randomWalks(graph, { seed: 1 })).toEqual(randomWalks(graph, { seed: 1 }));
    expect(randomWalks(graph, { seed: 1 })).not.toEqual(randomWalks(graph, { seed: 2 }));
  });

  it('stops at a vertex without outgoing edges', () => {
    const [a, b] = [vertexId('a'), vertexId('b')] as const;
    const graph = new GraphBuilder({ directed: true })
      .addVertex(a)
      .addVertex(b)
      .addEdge(a, b)
      .build();

    expect(randomWalks(graph, { walksPerVertex: 1 })).toEqual([[a, b], [b]]);
  });

  it('prefers heavy edges when weighted', () => {
    const [hub, light, heavy] = [vertexId('h'), vertexId('l'), vertexId('v')] as const;
    const graph = new GraphBuilder({ directed: true })
      .addVertex(hub)
      .addVertex(light)
      .addVertex(heavy)
      .addEdge(hub, light, 1)
      .addEdge(hub, heavy, 1000)
      .build();
    const walks = randomWalks(graph, { walksPerVertex: 200, length: 2, isWeighted: true }).filter(
      ([start]) => start === hub,
    );
    const heavyCount = walks.filter(([, second]) => second === heavy).length;

    expect(heavyCount).toBeGreaterThan(190);
  });

  it('rejects non-positive counts', () => {
    expect(() => randomWalks(pathGraph(3), { walksPerVertex: 0 })).toThrow(GraphError);
    expect(() => randomWalks(pathGraph(3), { length: 1.5 })).toThrow(GraphError);
  });
});

describe('spectralEmbedding', () => {
  it('orders a path along its Fiedler vector', () => {
    const embedding = spectralEmbedding(pathGraph(5), { dimensions: 1 });
    const coordinates = pathGraph(5)
      .vertices()
      .map((id) => embedding.get(id)![0]!);
    const increasing = coordinates.every(
      (value, index) => index === 0 || value > coordinates[index - 1]!,
    );
    const decreasing = coordinates.every(
      (value, index) => index === 0 || value < coordinates[index - 1]!,
    );

    expect(increasing || decreasing).toBe(true);
  });

  it('returns one vector of the requested size per vertex', () => {
    const embedding = spectralEmbedding(pathGraph(6), { dimensions: 3, isWeighted: true });

    expect(embedding.size).toBe(6);
    expect(embedding.values().every((vector) => vector.length === 3)).toBe(true);
    expect(spectralEmbedding(pathGraph(4)).get(vertexId('0'))).toHaveLength(2);
  });

  it('rejects impossible dimensions and directed graphs', () => {
    expect(() => spectralEmbedding(pathGraph(3), { dimensions: 0 })).toThrow(GraphError);
    expect(() => spectralEmbedding(pathGraph(3), { dimensions: 3 })).toThrow(GraphError);
    expect(() => spectralEmbedding(pathGraph(3), { dimensions: 1.5 })).toThrow(GraphError);

    expect(() => spectralEmbedding(pathGraph(3, { directed: true }), { dimensions: 1 })).toThrow(
      GraphError,
    );
  });
});
