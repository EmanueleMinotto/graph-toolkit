import { GraphBuilder, vertexId } from '@graph-toolkit/core';
import { completeGraph, hypercubeGraph, pathGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import { spectralLayout, tutteLayout } from './index.js';

interface Pt {
  readonly x: number;
  readonly y: number;
}

const orient = (a: Pt, b: Pt, c: Pt): number =>
  Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

const cross = (first: readonly [Pt, Pt], second: readonly [Pt, Pt]): boolean =>
  orient(first[0], first[1], second[0]) !== orient(first[0], first[1], second[1]) &&
  orient(second[0], second[1], first[0]) !== orient(second[0], second[1], first[1]);

describe('spectralLayout', () => {
  it('lays a path out along a line and separates the two halves', () => {
    const layout = spectralLayout(pathGraph(5));
    const xs = pathGraph(5)
      .vertices()
      .map((id) => layout.get(id)!.x);
    const ordered =
      xs.every((x, index) => index === 0 || x > xs[index - 1]!) ||
      xs.every((x, index) => index === 0 || x < xs[index - 1]!);
    expect(ordered).toBe(true);
  });

  it('ignores self-loops', () => {
    const builder = new GraphBuilder({ directed: false });
    for (const name of ['a', 'b', 'c']) builder.addVertex(vertexId(name));
    builder
      .addEdge(vertexId('a'), vertexId('a'))
      .addEdge(vertexId('a'), vertexId('b'))
      .addEdge(vertexId('b'), vertexId('c'));
    expect(spectralLayout(builder.build()).size).toBe(3);
  });

  it('handles tiny and edgeless graphs', () => {
    expect(spectralLayout(pathGraph(1)).size).toBe(1);
    expect(spectralLayout(pathGraph(0)).size).toBe(0);
    expect(spectralLayout(pathGraph(2)).size).toBe(2);
  });
});

describe('tutteLayout', () => {
  it('pins the outer cycle on the unit circle and puts inner vertices inside', () => {
    const wheel = completeGraph(4);
    const layout = tutteLayout(wheel);
    const radii = wheel.vertices().map((id) => Math.hypot(layout.get(id)!.x, layout.get(id)!.y));
    expect(Math.max(...radii)).toBeCloseTo(1);
    expect(Math.min(...radii)).toBeLessThan(0.99);
  });

  it('is a planar drawing of the cube: no two edges cross', () => {
    const cube = hypercubeGraph(3);
    const layout = tutteLayout(cube);
    const segments = cube.edges().map((edge) => ({
      ends: [edge.source, edge.target],
      line: [layout.get(edge.source)!, layout.get(edge.target)!] as const,
    }));
    const pairs = segments.flatMap((first, index) =>
      segments.slice(index + 1).map((second) => [first, second] as const),
    );
    const independent = pairs.filter(([a, b]) => new Set([...a.ends, ...b.ends]).size === 4);
    expect(independent.some(([a, b]) => cross(a.line, b.line))).toBe(false);
  });

  it('scans only a bounded number of edges and ignores self-loops', () => {
    expect(tutteLayout(completeGraph(25)).size).toBe(25);
    const loop = new GraphBuilder({ directed: false });
    for (const name of ['a', 'b', 'c']) loop.addVertex(vertexId(name));
    loop
      .addEdge(vertexId('a'), vertexId('a'))
      .addEdge(vertexId('a'), vertexId('b'))
      .addEdge(vertexId('b'), vertexId('c'))
      .addEdge(vertexId('c'), vertexId('a'));
    expect(tutteLayout(loop.build()).size).toBe(3);
  });

  it('falls back to a radial layout for forests and parks cut-off components outside', () => {
    expect(tutteLayout(pathGraph(4)).size).toBe(4);
    const builder = new GraphBuilder({ directed: false });
    for (const name of ['a', 'b', 'c', 'x', 'y']) builder.addVertex(vertexId(name));
    builder
      .addEdge(vertexId('a'), vertexId('b'))
      .addEdge(vertexId('b'), vertexId('c'))
      .addEdge(vertexId('c'), vertexId('a'));
    builder.addEdge(vertexId('x'), vertexId('y'));
    const layout = tutteLayout(builder.build());
    expect(layout.size).toBe(5);
    expect(Math.hypot(layout.get(vertexId('x'))!.x, layout.get(vertexId('x'))!.y)).toBeCloseTo(1.5);
    expect(tutteLayout(pathGraph(0)).size).toBe(0);
  });
});
