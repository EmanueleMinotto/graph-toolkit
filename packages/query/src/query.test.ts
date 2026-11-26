import {
  GraphBuilder,
  GraphError,
  UnknownVertexError,
  vertexId,
  type VertexId,
} from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { filterEdges, selectVertices } from './index.js';

const [a, b, c, d, extra] = ['a', 'b', 'c', 'd', 'x'].map((id) => vertexId(id)) as [
  VertexId,
  VertexId,
  VertexId,
  VertexId,
  VertexId,
];

const graph = new GraphBuilder({ directed: true })
  .addVertex(a, { kind: 'city', size: 3 })
  .addVertex(b, { kind: 'town' })
  .addVertex(c, { kind: 'city' })
  .addVertex(d)
  .addVertex(extra)
  .addEdge(a, b, { weight: 2, attributes: { road: 'A1' } })
  .addEdge(b, c)
  .addEdge(c, d)
  .addEdge(a, a)
  .build();

describe('VertexQuery', () => {
  it('starts from every vertex or from given ids, rejecting unknown ones', () => {
    expect(selectVertices(graph).count()).toBe(5);
    expect(selectVertices(graph, [c, a]).ids()).toEqual([c, a]);
    expect(() => selectVertices(graph, [vertexId('zzz')])).toThrow(UnknownVertexError);
  });

  it('filters by predicate and by attribute', () => {
    expect(
      selectVertices(graph)
        .where((id) => id > 'b')
        .ids(),
    ).toEqual([c, d, extra]);

    expect(selectVertices(graph).withAttribute('kind').ids()).toEqual([a, b, c]);
    expect(selectVertices(graph).withAttribute('kind', 'city').ids()).toEqual([a, c]);
    expect(selectVertices(graph).withAttribute('size', 4).ids()).toEqual([]);
  });

  it('follows outgoing edges one hop or several', () => {
    expect(selectVertices(graph, [a]).neighbors().ids()).toEqual([a, b]);
    expect(selectVertices(graph, [b]).neighbors().ids()).toEqual([c]);
    expect(selectVertices(graph, [b]).within(0).ids()).toEqual([b]);
    expect(selectVertices(graph, [b]).within(1).ids()).toEqual([b, c]);
    expect(selectVertices(graph, [a]).within(2).ids()).toEqual([a, b, c]);
    expect(selectVertices(graph, [a]).within(9).ids()).toEqual([a, b, c, d]);
    expect(() => selectVertices(graph).within(-1)).toThrow(GraphError);
    expect(() => selectVertices(graph).within(1.5)).toThrow(GraphError);
  });

  it('exposes the edges and the subgraph induced by the selection', () => {
    const chosen = selectVertices(graph, [a, b]);

    expect(chosen.edges().map(({ source, target }) => `${source}>${target}`)).toEqual([
      'a>b',
      'a>a',
    ]);

    const sub = chosen.subgraph();

    expect(sub.vertices()).toEqual([a, b]);
    expect(sub.vertexAttributes(a)).toEqual({ kind: 'city', size: 3 });
    expect(sub.vertexAttributes(vertexId('b'))).toEqual({ kind: 'town' });

    expect(sub.neighbors(a).find(({ target }) => target === b)).toMatchObject({
      weight: 2,
      attributes: { road: 'A1' },
    });

    expect(sub.directed).toBe(true);
  });

  it('keeps vertices without attributes attribute-free', () => {
    expect(selectVertices(graph, [d]).subgraph().vertexAttributes(d)).toEqual({});
  });
});

describe('filterEdges', () => {
  it('keeps every vertex and only the accepted edges', () => {
    const light = filterEdges(graph, ({ weight }) => weight < 2);

    expect(light.vertices()).toEqual(graph.vertices());
    expect(light.edgeCount).toBe(3);
    expect(light.hasEdge(a, b)).toBe(false);
    expect(light.vertexAttributes(a)).toEqual({ kind: 'city', size: 3 });
  });
});
