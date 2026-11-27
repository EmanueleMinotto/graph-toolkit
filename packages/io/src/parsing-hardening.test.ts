import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { fromBinary, fromDot, fromEdgeList, toBinary } from './index.js';

const edgesOf = (graph: Graph): string[] =>
  graph.edges().map((edge) => `${edge.source}>${edge.target}:${edge.weight}`);

describe('DOT parsing', () => {
  it('ignores edges written inside every kind of comment', () => {
    const graph = fromDot(
      [
        'graph {',
        '  /* a -- b',
        '     c -- d */ x -- y // p -- q',
        '  # r -- s',
        '  y -- z [weight=12.75]',
        '}',
      ].join('\n'),
    );

    expect(edgesOf(graph)).toEqual(['x>y:1', 'y>z:12.75']);
    expect(graph.vertices()).toEqual(['x', 'y', 'z']);
  });

  it('reads multi-digit, decimal and negative identifiers and weights', () => {
    const graph = fromDot(
      'graph { -7 -- 42 [weight=105]; 42 -- 3.25 [weight = -0.5]; 3.25 -- 1000 [weight="8.125"] }',
    );

    expect(edgesOf(graph)).toEqual(['-7>42:105', '42>3.25:-0.5', '3.25>1000:8.125']);
  });

  it('keeps nodes written with attributes out of the vertex list but edges in', () => {
    const graph = fromDot('digraph G { a -> b [label="x", weight=3]; solo; c -> a }');

    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['solo', 'a', 'b', 'c']);
    expect(edgesOf(graph)).toEqual(['a>b:3', 'c>a:1']);
  });

  it('accepts several spaces around the header words', () => {
    expect(fromDot('   strict    digraph    Name   { a -> b }').directed).toBe(true);
    expect(fromDot('\n\n graph\tG\n{ a -- b }').directed).toBe(false);
  });
});

describe('edge-list parsing', () => {
  it('splits on any mix of spaces, tabs and commas', () => {
    const graph = fromEdgeList('a  b   2\nc,d,3\ne\t f\t4\ng , h , 5 # note');

    expect(edgesOf(graph)).toEqual(['a>b:2', 'c>d:3', 'e>f:4', 'g>h:5']);
  });
});

describe('binary buffer growth', () => {
  it('round-trips many floating-point weights that outgrow the initial buffer', () => {
    const builder = new GraphBuilder({ directed: true });

    for (let index = 0; index < 60; index++) {
      builder.addVertex(vertexId(`node-${index}`));
    }

    for (let index = 0; index < 400; index++) {
      builder.addEdge(
        vertexId(`node-${index % 60}`),
        vertexId(`node-${((index % 60) + 1 + Math.floor(index / 60)) % 60}`),
        1.5 + index / 8,
      );
    }

    const graph = builder.build();
    const back = fromBinary(toBinary(graph));

    expect(back.vertices()).toEqual(graph.vertices());
    expect(edgesOf(back)).toEqual(edgesOf(graph));
  });
});
