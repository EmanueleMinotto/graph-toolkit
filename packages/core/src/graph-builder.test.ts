import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DuplicateError, GraphBuilder, UnknownVertexError, vertexId } from './index.js';

const [a, b, c] = ['a', 'b', 'c'].map(vertexId) as [
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
];

const triangle = (directed: boolean) =>
  new GraphBuilder({ directed })
    .addVertex(a)
    .addVertex(b)
    .addVertex(c)
    .addEdge(a, b, 2)
    .addEdge(b, c)
    .addEdge(c, c)
    .build();

describe('GraphBuilder', () => {
  it('builds an undirected graph with symmetric arcs', () => {
    const graph = triangle(false);
    expect(graph.vertexCount).toBe(3);
    expect(graph.edgeCount).toBe(3);
    expect(graph.hasEdge(b, a)).toBe(true);
    expect(graph.degree(c)).toBe(2);
    expect(graph.edges().map((edge) => edge.weight)).toEqual([2, 1, 1]);
  });

  it('builds a directed graph', () => {
    const graph = triangle(true);
    expect(graph.hasEdge(a, b)).toBe(true);
    expect(graph.hasEdge(b, a)).toBe(false);
    expect(graph.neighbors(a)).toEqual([{ source: a, target: b, weight: 2 }]);
    expect(graph.edges()).toHaveLength(3);
  });

  it('exposes vertices and index mapping', () => {
    const graph = triangle(false);
    expect(graph.vertices()).toEqual([a, b, c]);
    expect(graph.hasVertex(a)).toBe(true);
    expect(graph.hasVertex(vertexId('z'))).toBe(false);
    expect(graph.vertexAt(graph.indexOf(b))).toBe(b);
  });

  it('rejects duplicates and unknown vertices', () => {
    const builder = new GraphBuilder().addVertex(a).addVertex(b).addEdge(a, b);
    expect(() => builder.addVertex(a)).toThrow(DuplicateError);
    expect(() => builder.addEdge(b, a)).toThrow(DuplicateError);
    expect(() => builder.addEdge(a, c)).toThrow(UnknownVertexError);
    const graph = builder.build();
    expect(() => graph.indexOf(c)).toThrow(UnknownVertexError);
    expect(() => graph.vertexAt(9)).toThrow(UnknownVertexError);
  });

  it('keeps handshake lemma: sum of degrees = 2E - loops (undirected)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(fc.nat(7), fc.nat(7)), {
          selector: ([x, y]) => `${Math.min(x, y)}:${Math.max(x, y)}`,
        }),
        (pairs) => {
          const builder = new GraphBuilder();
          for (let index = 0; index < 8; index++) builder.addVertex(vertexId(String(index)));
          for (const [x, y] of pairs) builder.addEdge(vertexId(String(x)), vertexId(String(y)));
          const graph = builder.build();
          const loops = pairs.filter(([x, y]) => x === y).length;
          const total = graph.vertices().reduce((sum, id) => sum + graph.degree(id), 0);
          expect(total).toBe(2 * graph.edgeCount - loops);
        },
      ),
    );
  });

  it('allows parallel edges only when asked', () => {
    const multi = new GraphBuilder({ allowParallelEdges: true })
      .addVertex(a)
      .addVertex(b)
      .addEdge(a, b, 1)
      .addEdge(b, a, 3)
      .addEdge(a, a)
      .build();
    expect(multi.edgeCount).toBe(3);
    expect(
      multi
        .edges()
        .map((edge) => edge.weight)
        .toSorted((x, y) => x - y),
    ).toEqual([1, 1, 3]);
    expect(multi.degree(a)).toBe(3);
  });
});
