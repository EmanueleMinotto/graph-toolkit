import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { fromMermaid, ParseError, toMermaid } from './index.js';

const [a, b, c] = [vertexId('a'), vertexId('b "q" & <c>'), vertexId('c')] as const;

const sample = (directed: boolean): Graph =>
  new GraphBuilder({ directed })
    .addVertex(a)
    .addVertex(b)
    .addVertex(c)
    .addEdge(a, b, 2.5)
    .addEdge(b, c)
    .build();

const shape = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges(),
});

describe('mermaid import', () => {
  it('round trips exported flowcharts', () => {
    for (const directed of [false, true]) {
      const graph = sample(directed);

      expect(shape(fromMermaid(toMermaid(graph)))).toEqual(shape(graph));
    }
  });

  it('parses hand-written charts with weights, comments and bare nodes', () => {
    const graph = fromMermaid(
      'graph TD\n  %% note\n  a --> b\n  b -->|2.5| c(Cee)\n  d\n  e[Eee] --> a;',
    );

    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['a', 'b', 'Cee', 'Eee', 'd']);
    expect(graph.edges().map((edge) => edge.weight)).toEqual([1, 2.5, 1]);
  });

  it('treats --- as undirected and ignores non-numeric weights', () => {
    const graph = fromMermaid('flowchart LR\n a ---|x| b');

    expect(graph.directed).toBe(false);
    expect(graph.edges()[0]?.weight).toBe(1);
  });

  it('requires a header', () => {
    expect(() => fromMermaid('a --> b')).toThrow(ParseError);
    expect(() => fromMermaid('')).toThrow(ParseError);
  });
});
