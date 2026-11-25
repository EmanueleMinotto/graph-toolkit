import { pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { edgeKey, NONE, type Highlight } from './analysis-types.js';
import { buildScene, PALETTE, STRIDE } from './webgl-scene.js';

const graph = pathGraph(3);
const position = (id: string) => ({ x: Number(id) * 10, y: 5 });

describe('buildScene', () => {
  it('emits one row per vertex and two per edge', () => {
    const scene = buildScene({ graph, position, highlight: NONE });
    expect(scene.vertices).toHaveLength(3 * STRIDE);
    expect(scene.edges).toHaveLength(2 * 2 * STRIDE);
    expect([scene.vertices[0], scene.vertices[1]]).toEqual([0, 5]);
  });

  it('colors vertices and sizes them by score', () => {
    const highlight: Highlight = {
      ...NONE,
      colors: new Map([[vertexId('1'), 2]]),
      sizes: new Map([[vertexId('1'), 0]]),
    };
    const { vertices } = buildScene({ graph, position, highlight });
    const row = vertices.slice(STRIDE, 2 * STRIDE);
    expect(row[2]).toBeCloseTo(PALETTE[2]![0]);
    expect(row[6]).toBeLessThan(vertices[6]!);
  });

  it('highlights edges and skips unplaced vertices', () => {
    const key = edgeKey(vertexId('0'), vertexId('1'), false);
    const highlight: Highlight = { ...NONE, edges: new Set([key]) };
    const scene = buildScene({ graph, position, highlight });
    expect(scene.edges[5]).toBeGreaterThan(0.9);
    expect(scene.edges[2 * STRIDE + 5]).toBeLessThan(0.9);
    const hidden = buildScene({
      graph,
      position: (id) => (id === '1' ? undefined : position(id)),
      highlight: NONE,
    });
    expect(hidden.vertices).toHaveLength(2 * STRIDE);
    expect(hidden.edges).toHaveLength(0);
  });

  it('uses palette colors for colored edges', () => {
    const key = edgeKey(vertexId('0'), vertexId('1'), false);
    const highlight: Highlight = { ...NONE, edgeColors: new Map([[key, 3]]) };
    expect(buildScene({ graph, position, highlight }).edges[2]).toBeCloseTo(PALETTE[3]![0]);
  });

  it('adds an arrowhead per edge of a directed graph, pointing at the target', () => {
    const directed = pathGraph(2, { directed: true });
    const { arrows } = buildScene({ graph: directed, position, highlight: NONE });
    expect(arrows).toHaveLength(3 * STRIDE);
    expect(arrows[0]).toBeLessThan(10);
    expect(arrows[0]).toBeGreaterThan(arrows[STRIDE]!);
    expect(buildScene({ graph, position, highlight: NONE }).arrows).toHaveLength(0);
  });

  it('skips arrowheads for zero-length or unplaced edges', () => {
    const directed = pathGraph(2, { directed: true });
    const same = buildScene({ graph: directed, position: () => ({ x: 1, y: 1 }), highlight: NONE });
    expect(same.arrows).toHaveLength(0);
    const missing = buildScene({
      graph: directed,
      position: (id) => (id === '1' ? undefined : position(id)),
      highlight: NONE,
    });
    expect(missing.arrows).toHaveLength(0);
  });
});
