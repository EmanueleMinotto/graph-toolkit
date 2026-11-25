import { describe, expect, it } from 'vitest';
import {
  barabasiAlbertGraph,
  binaryTreeGraph,
  completeBipartiteGraph,
  completeGraph,
  cycleGraph,
  gridGraph,
  hypercubeGraph,
  petersenGraph,
  randomGraphWithEdges,
  wattsStrogatzGraph,
  wheelGraph,
  pathGraph,
  randomGraph,
  starGraph,
} from './index.js';

describe('generators', () => {
  it('builds paths, including the empty one', () => {
    expect(pathGraph(4).edgeCount).toBe(3);
    expect(pathGraph(0).vertexCount).toBe(0);
    expect(pathGraph(1).edgeCount).toBe(0);
  });

  it('builds cycles and degenerates to a path below 3 vertices', () => {
    expect(cycleGraph(5).edgeCount).toBe(5);
    expect(cycleGraph(2).edgeCount).toBe(1);
  });

  it('builds complete graphs with n(n-1)/2 edges', () => {
    expect(completeGraph(6).edgeCount).toBe(15);
    expect(completeGraph(3, { directed: true }).directed).toBe(true);
  });

  it('builds stars and grids', () => {
    expect(starGraph(5).degree(starGraph(5).vertices()[0]!)).toBe(4);
    expect(starGraph(0).vertexCount).toBe(0);
    expect(gridGraph(3, 4).edgeCount).toBe(17);
  });

  it('builds reproducible random graphs', () => {
    const first = randomGraph(20, { probability: 0.3, seed: 42 }).edges();
    expect(randomGraph(20, { probability: 0.3, seed: 42 }).edges()).toEqual(first);
    expect(randomGraph(20, { probability: 0.3, seed: 43 }).edges()).not.toEqual(first);
    expect(randomGraph(10, { probability: 0, seed: 1 }).edgeCount).toBe(0);
    expect(randomGraph(10, { probability: 1, seed: 1 }).edgeCount).toBe(45);
  });
});

describe('randomGraph at scale', () => {
  it('has the expected density and no duplicate edges', () => {
    const graph = randomGraph(2000, { probability: 0.01, seed: 3 });
    const expected = 0.01 * ((2000 * 1999) / 2);
    expect(Math.abs(graph.edgeCount - expected)).toBeLessThan(expected * 0.1);
    expect(new Set(graph.edges().map((edge) => `${edge.source}-${edge.target}`)).size).toBe(
      graph.edgeCount,
    );
  });
});

const degrees = (graph: ReturnType<typeof petersenGraph>) =>
  graph.vertices().map((vertex) => graph.degree(vertex));

describe('structured and random families', () => {
  it('builds the Petersen graph: 10 vertices, 3-regular', () => {
    const graph = petersenGraph();
    expect(graph.edgeCount).toBe(15);
    expect(new Set(degrees(graph))).toEqual(new Set([3]));
  });

  it('builds wheels, bipartite, binary trees and hypercubes', () => {
    expect(wheelGraph(6).edgeCount).toBe(10);
    expect(wheelGraph(0).vertexCount).toBe(0);
    expect(completeBipartiteGraph(2, 3).edgeCount).toBe(6);
    expect(binaryTreeGraph(7).edgeCount).toBe(6);
    expect(binaryTreeGraph(0).edgeCount).toBe(0);
    expect(hypercubeGraph(3).edgeCount).toBe(12);
  });

  it('draws exactly m edges for G(n, m), capped at the maximum', () => {
    expect(randomGraphWithEdges(8, { edges: 10, seed: 1 }).edgeCount).toBe(10);
    expect(randomGraphWithEdges(4, { edges: 99, seed: 1 }).edgeCount).toBe(6);
  });

  it('grows Barabási–Albert graphs with attach edges per new vertex', () => {
    const graph = barabasiAlbertGraph(20, { attach: 2, seed: 7 });
    expect(graph.edgeCount).toBe(3 + 17 * 2);
    expect(barabasiAlbertGraph(2, { attach: 5, seed: 7 }).edgeCount).toBe(1);
    expect(barabasiAlbertGraph(20, { attach: 2, seed: 7 }).edges()).toEqual(graph.edges());
  });

  it('keeps the edge count under Watts–Strogatz rewiring and is seed-deterministic', () => {
    const options = { neighbors: 4, beta: 0.5, seed: 3 };
    const graph = wattsStrogatzGraph(20, options);
    expect(graph.edgeCount).toBe(40);
    expect(wattsStrogatzGraph(20, options).edges()).toEqual(graph.edges());
    expect(wattsStrogatzGraph(20, { ...options, beta: 0 }).edgeCount).toBe(40);
  });

  it('stays simple when the lattice wraps onto itself (few vertices, wide reach)', () => {
    const options = { neighbors: 4, beta: 0.3, seed: 1 };
    expect(wattsStrogatzGraph(4, options).edgeCount).toBe(6);
    expect(wattsStrogatzGraph(1, options).edgeCount).toBe(0);
  });
});
