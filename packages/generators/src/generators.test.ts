import { describe, expect, it } from 'vitest';
import {
  completeGraph,
  cycleGraph,
  gridGraph,
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
