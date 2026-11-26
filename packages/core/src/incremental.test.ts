import { describe, expect, it } from 'vitest';
import {
  DuplicateError,
  GraphBuilder,
  UnknownEdgeError,
  UnknownVertexError,
  vertexId,
  type Graph,
} from './index.js';

const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(vertexId) as [
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
];

const sample = (directed = false): Graph =>
  new GraphBuilder({ directed })
    .addVertex(a, { label: 'first' })
    .addVertex(b)
    .addVertex(c, { label: 'third' })
    .addEdge(a, b, { weight: 2, attributes: { kind: 'road' } })
    .addEdge(b, c, 5)
    .addEdge(c, c)
    .build();

const summary = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices().map((id) => [id, graph.vertexAttributes(id)]),
  edges: graph.edges(),
});

describe('GraphBuilder.from', () => {
  it('copies vertices, weights and attributes of undirected and directed graphs', () => {
    expect(summary(GraphBuilder.from(sample()).build())).toEqual(summary(sample()));
    expect(summary(GraphBuilder.from(sample(true)).build())).toEqual(summary(sample(true)));
  });

  it('keeps accepting new vertices and edges, and still rejects duplicates', () => {
    const builder = GraphBuilder.from(sample()).addVertex(d).addEdge(c, d, 7);

    expect(builder.build().hasEdge(d, c)).toBe(true);
    expect(() => builder.addEdge(a, b)).toThrow(DuplicateError);
    expect(() => builder.addVertex(a)).toThrow(DuplicateError);
  });

  it('carries multigraphs over unless told otherwise', () => {
    const multi = new GraphBuilder({ allowParallelEdges: true })
      .addVertex(a)
      .addVertex(b)
      .addEdge(a, b, 1)
      .addEdge(b, a, 2)
      .build();
    const copy = GraphBuilder.from(multi);

    expect(copy.build().edgeCount).toBe(2);
    expect(() => copy.addEdge(a, b)).not.toThrow();
    expect(() => GraphBuilder.from(multi, { allowParallelEdges: false })).toThrow(DuplicateError);
  });

  it('adds no attribute data when the source graph has none', () => {
    const plain = new GraphBuilder().addVertex(a).addVertex(b).addEdge(a, b).build();

    expect(GraphBuilder.from(plain).build().csr.arcEdges).toBeUndefined();
  });
});

describe('GraphBuilder.removeEdge', () => {
  it('removes an undirected edge whichever way it is named, then allows re-adding it', () => {
    const builder = GraphBuilder.from(sample()).removeEdge(b, a);

    expect(builder.build().hasEdge(a, b)).toBe(false);
    expect(builder.build().edgeCount).toBe(2);
    expect(() => builder.addEdge(a, b, 9)).not.toThrow();
  });

  it('is direction-specific on directed graphs', () => {
    const graph = GraphBuilder.from(sample(true)).removeEdge(a, b).build();

    expect(graph.hasEdge(a, b)).toBe(false);
    expect(graph.hasEdge(b, c)).toBe(true);
    expect(() => GraphBuilder.from(sample(true)).removeEdge(b, a)).toThrow(UnknownEdgeError);
  });

  it('removes all parallel edges and keeps the attributes of the rest aligned', () => {
    const multi = new GraphBuilder({ allowParallelEdges: true })
      .addVertex(a)
      .addVertex(b)
      .addVertex(c)
      .addEdge(a, b, { attributes: { id: 1 } })
      .addEdge(b, c, { attributes: { id: 2 } })
      .addEdge(b, a, { attributes: { id: 3 } })
      .build();
    const graph = GraphBuilder.from(multi).removeEdge(a, b).build();

    expect(graph.edges().map((edge) => edge.attributes)).toEqual([{ id: 2 }]);
  });

  it('rejects unknown edges and vertices', () => {
    const builder = GraphBuilder.from(sample());

    expect(() => builder.removeEdge(a, c)).toThrow(UnknownEdgeError);
    expect(() => builder.removeEdge(a, d)).toThrow(UnknownVertexError);
  });
});

describe('GraphBuilder.removeVertex', () => {
  it('drops incident edges (loops too) and renumbers what follows', () => {
    const graph = GraphBuilder.from(sample()).removeVertex(b).build();

    expect(graph.vertices()).toEqual([a, c]);
    expect(graph.indexOf(c)).toBe(1);
    expect(graph.edges()).toEqual([{ source: c, target: c, weight: 1 }]);
    expect(graph.vertexAttributes(a)).toEqual({ label: 'first' });
    expect(graph.vertexAttributes(c)).toEqual({ label: 'third' });
  });

  it('works at the ends, keeps edge attributes aligned and frees the name', () => {
    const builder = GraphBuilder.from(sample()).removeVertex(a);
    const graph = builder.build();

    expect(graph.vertices()).toEqual([b, c]);
    expect(graph.vertexAttributes(c)).toEqual({ label: 'third' });
    expect(graph.edges().map((edge) => edge.weight)).toEqual([5, 1]);

    builder.addVertex(a, { label: 'again' }).addEdge(a, b, { attributes: { kind: 'new' } });

    expect(builder.build().edgesBetween(a, b)[0]?.attributes).toEqual({ kind: 'new' });
    expect(() => GraphBuilder.from(sample()).removeVertex(d)).toThrow(UnknownVertexError);
  });

  it('empties a graph vertex by vertex', () => {
    const builder = GraphBuilder.from(sample()).removeVertex(c).removeVertex(a).removeVertex(b);

    expect(builder.build().vertexCount).toBe(0);
    expect(builder.build().edgeCount).toBe(0);
  });
});
