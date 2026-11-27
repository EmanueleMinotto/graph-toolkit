import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  circularLayout,
  forceLayout,
  layeredLayout,
  radialLayout,
  tutteLayout,
  type Layout,
} from './index.js';

const id = (name: string) => vertexId(name);

const build = (
  names: readonly string[],
  arcs: readonly (readonly [string, string])[],
  directed = true,
): Graph => {
  const builder = new GraphBuilder({ directed });

  for (const name of names) {
    builder.addVertex(id(name));
  }

  for (const [from, to] of arcs) {
    builder.addEdge(id(from), id(to));
  }

  return builder.build();
};

const at = (layout: Layout, name: string) => layout.get(id(name))!;

describe('circularLayout', () => {
  it('spreads vertices a quarter turn apart', () => {
    const layout = circularLayout(pathGraph(4), 2);

    expect(at(layout, '0').x).toBeCloseTo(2);
    expect(at(layout, '1').x).toBeCloseTo(0);
    expect(at(layout, '1').y).toBeCloseTo(2);
    expect(at(layout, '2').x).toBeCloseTo(-2);
    expect(at(layout, '3').y).toBeCloseTo(-2);
  });
});

describe('radialLayout', () => {
  it('puts leaves on a ring a quarter turn apart, scaled by the ring gap', () => {
    const layout = radialLayout(starGraph(5), { ringGap: 3 });

    expect(at(layout, '0')).toEqual({ x: 0, y: 0 });
    expect(at(layout, '1').x).toBeCloseTo(3);
    expect(at(layout, '1').y).toBeCloseTo(0);
    expect(at(layout, '2').x).toBeCloseTo(0);
    expect(at(layout, '2').y).toBeCloseTo(3);
    expect(at(layout, '3').x).toBeCloseTo(-3);
    expect(at(layout, '4').y).toBeCloseTo(-3);
  });

  it('puts every hop on its own ring', () => {
    const layout = radialLayout(pathGraph(4), { ringGap: 2 });

    expect(at(layout, '3').x).toBeCloseTo(6);
    expect(Math.hypot(at(layout, '2').x, at(layout, '2').y)).toBeCloseTo(4);
  });

  it('starts from the given root and gives an empty graph an empty layout', () => {
    const layout = radialLayout(pathGraph(3), { root: id('2') });

    expect(at(layout, '2')).toEqual({ x: 0, y: 0 });
    expect(radialLayout(pathGraph(0)).size).toBe(0);
  });
});

describe('layeredLayout', () => {
  it('layers a DAG by longest path and centers every layer', () => {
    const diamond = build(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['a', 'c'],
        ['b', 'd'],
        ['c', 'd'],
      ],
    );
    const layout = layeredLayout(diamond, { layerGap: 2, nodeGap: 3 });

    expect(at(layout, 'a')).toEqual({ x: 0, y: 0 });
    expect(at(layout, 'd')).toEqual({ x: 0, y: 4 });
    expect(at(layout, 'b').y).toBe(2);
    expect(at(layout, 'c').y).toBe(2);
    expect([at(layout, 'b').x, at(layout, 'c').x].toSorted((l, r) => l - r)).toEqual([-1.5, 1.5]);
  });

  it('uses the longest path, not the shortest, to pick a layer', () => {
    const shortcut = build(
      ['a', 'b', 'c'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['a', 'c'],
      ],
    );

    expect(at(layeredLayout(shortcut), 'c').y).toBe(2);
  });

  it('orders a layer by the average position of its parents to avoid crossings', () => {
    const crossing = build(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'd'],
        ['b', 'c'],
      ],
    );
    const layout = layeredLayout(crossing);

    expect(at(layout, 'd').x).toBeLessThan(at(layout, 'c').x);
  });

  it('falls back to breadth-first depth on a cyclic graph', () => {
    const loop = build(
      ['a', 'b', 'c'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
      ],
    );
    const layout = layeredLayout(loop);

    expect([at(layout, 'a').y, at(layout, 'b').y, at(layout, 'c').y]).toEqual([0, 1, 2]);
  });
});

describe('tutteLayout', () => {
  it('draws a tree like the radial layout', () => {
    expect(tutteLayout(pathGraph(4))).toEqual(radialLayout(pathGraph(4)));
  });

  it('spaces a square evenly around the unit circle', () => {
    const square = build(
      ['a', 'b', 'c', 'd'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'a'],
      ],
      false,
    );
    const layout = tutteLayout(square);

    for (const name of ['a', 'b', 'c', 'd']) {
      expect(Math.hypot(at(layout, name).x, at(layout, name).y)).toBeCloseTo(1);
    }

    const [first, second] = [at(layout, 'a'), at(layout, 'b')];

    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeCloseTo(Math.SQRT2);
  });

  it('puts a vertex cut off from the cycle on the outer ring', () => {
    const graph = build(
      ['a', 'b', 'c', 'x', 'y'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
        ['x', 'y'],
      ],
      false,
    );
    const layout = tutteLayout(graph);

    expect(Math.hypot(at(layout, 'x').x, at(layout, 'x').y)).toBeCloseTo(1.5);
    expect(Math.hypot(at(layout, 'y').x, at(layout, 'y').y)).toBeCloseTo(1.5);
  });

  it('settles inner vertices at the mean of their neighbours', () => {
    const wheel = build(
      ['a', 'b', 'c', 'h'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
        ['h', 'a'],
        ['h', 'b'],
        ['h', 'c'],
      ],
      false,
    );
    const layout = tutteLayout(wheel);

    expect(at(layout, 'h').x).toBeCloseTo(0);
    expect(at(layout, 'h').y).toBeCloseTo(0);
  });
});

const distance = (layout: Layout, left: string, right: string): number =>
  Math.hypot(at(layout, left).x - at(layout, right).x, at(layout, left).y - at(layout, right).y);

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

describe('forceLayout', () => {
  const names = ['0', '1', '2', '3', '4', '5', '6', '7'];
  const pairs = names.flatMap((left, index) =>
    names.slice(index + 1).map((right) => [left, right] as const),
  );

  it('keeps linked vertices closer than unlinked ones but never on top of each other', () => {
    const layout = forceLayout(pathGraph(8), { seed: 3 });
    const linked = pairs.filter(([left, right]) => Number(right) - Number(left) === 1);
    const apart = pairs.filter(([left, right]) => Number(right) - Number(left) > 1);

    expect(mean(linked.map(([left, right]) => distance(layout, left, right)))).toBeLessThan(
      mean(apart.map(([left, right]) => distance(layout, left, right))),
    );

    expect(
      Math.min(...pairs.map(([left, right]) => distance(layout, left, right))),
    ).toBeGreaterThan(0.01);
  });

  it('pulls two cliques into separate clusters', () => {
    const builder = new GraphBuilder({ directed: false });

    for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
      builder.addVertex(id(name));
    }

    for (const [from, to] of [
      ['a', 'b'],
      ['b', 'c'],
      ['a', 'c'],
      ['d', 'e'],
      ['e', 'f'],
      ['d', 'f'],
    ] as const) {
      builder.addEdge(id(from), id(to));
    }

    const layout = forceLayout(builder.build(), { seed: 5 });
    const inside = [
      distance(layout, 'a', 'b'),
      distance(layout, 'b', 'c'),
      distance(layout, 'a', 'c'),
      distance(layout, 'd', 'e'),
      distance(layout, 'e', 'f'),
      distance(layout, 'd', 'f'),
    ];
    const between = [
      distance(layout, 'a', 'd'),
      distance(layout, 'b', 'e'),
      distance(layout, 'c', 'f'),
      distance(layout, 'a', 'f'),
    ];

    expect(mean(inside)).toBeLessThan(mean(between));
  });

  it('keeps moving with more iterations and stays in the unit square', () => {
    const graph = completeGraph(5);
    const start = forceLayout(graph, { iterations: 0, seed: 2 });
    const one = forceLayout(graph, { iterations: 1, seed: 2 });
    const many = forceLayout(graph, { iterations: 50, seed: 2 });

    expect(one).not.toEqual(start);
    expect(many).not.toEqual(one);

    for (const point of [...start.values(), ...many.values()]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  it('spreads a clique over more than a point', () => {
    const layout = forceLayout(completeGraph(6), { seed: 1 });
    const spread = [...layout.values()].map(({ x, y }) => Math.hypot(x - 0.5, y - 0.5));

    expect(Math.max(...spread)).toBeGreaterThan(0.1);
  });
});
