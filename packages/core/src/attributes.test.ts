import { describe, expect, it } from 'vitest';
import { GraphBuilder, UnknownVertexError, vertexId } from './index.js';

const [a, b, c] = ['a', 'b', 'c'].map(vertexId) as [
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
];

const base = (options: ConstructorParameters<typeof GraphBuilder>[0] = {}) =>
  new GraphBuilder(options).addVertex(a, { label: 'start', rank: 1 }).addVertex(b).addVertex(c);

describe('vertex attributes', () => {
  it('returns what was set, an empty frozen object otherwise', () => {
    const graph = base().build();

    expect(graph.vertexAttributes(a)).toEqual({ label: 'start', rank: 1 });
    expect(graph.vertexAttributes(b)).toEqual({});
    expect(Object.isFrozen(graph.vertexAttributes(b))).toBe(true);
    expect(() => graph.vertexAttributes(vertexId('nope'))).toThrow(UnknownVertexError);
  });

  it('copies the input so later edits do not leak in', () => {
    const input: Record<string, string> = { tag: 'x' };
    const graph = new GraphBuilder().addVertex(a, input).build();

    input['tag'] = 'changed';

    expect(graph.vertexAttributes(a)).toEqual({ tag: 'x' });
    expect(Object.isFrozen(graph.vertexAttributes(a))).toBe(true);
  });
});

describe('edge attributes', () => {
  it('shows up on both views of an undirected edge and in edges()', () => {
    const graph = base()
      .addEdge(a, b, { weight: 3, attributes: { kind: 'road' } })
      .addEdge(b, c, 2)
      .build();
    const edge = { source: a, target: b, weight: 3, attributes: { kind: 'road' } };

    expect(graph.neighbors(a)).toEqual([edge]);
    expect(graph.edgesBetween(b, a)).toEqual([{ ...edge, source: b, target: a }]);
    expect(graph.edges()[0]).toEqual(edge);
    expect(graph.neighbors(c)).toEqual([{ source: c, target: b, weight: 2 }]);
    expect(graph.edges()[1]).not.toHaveProperty('attributes');
  });

  it('accepts details without a weight and keeps directions apart', () => {
    const graph = base({ directed: true })
      .addEdge(a, b, { attributes: { dir: 'forward' } })
      .addEdge(b, a, { attributes: { dir: 'back' } })
      .build();

    expect(graph.edgesBetween(a, b)).toEqual([
      { source: a, target: b, weight: 1, attributes: { dir: 'forward' } },
    ]);

    expect(graph.edgesBetween(b, a)[0]?.attributes).toEqual({ dir: 'back' });
    expect(graph.hasEdge(a, b)).toBe(true);
    expect(graph.hasEdge(a, c)).toBe(false);
  });

  it('keeps each parallel edge with its own attributes, whatever the orientation', () => {
    const graph = base({ allowParallelEdges: true })
      .addEdge(a, b, { attributes: { id: 1 } })
      .addEdge(b, a, { attributes: { id: 2 } })
      .addEdge(a, b, 5)
      .build();
    const idsOf = (edges: ReturnType<typeof graph.edgesBetween>) =>
      edges.map((edge) => Number(edge.attributes?.['id'] ?? 0)).toSorted((x, y) => x - y);

    expect(idsOf(graph.edgesBetween(a, b))).toEqual([0, 1, 2]);
    expect(idsOf(graph.edgesBetween(b, a))).toEqual([0, 1, 2]);
    expect(idsOf(graph.edges())).toEqual([0, 1, 2]);
    expect(graph.edges().find((edge) => edge.weight === 5)).not.toHaveProperty('attributes');
  });

  it('keeps loops once, with their attributes', () => {
    const graph = base()
      .addEdge(c, c, { attributes: { loop: true } })
      .build();

    expect(graph.edges()).toEqual([
      { source: c, target: c, weight: 1, attributes: { loop: true } },
    ]);
  });

  it('adds no bookkeeping to graphs without attributes', () => {
    const graph = new GraphBuilder().addVertex(a).addVertex(b).addEdge(a, b).build();

    expect(graph.csr.arcEdges).toBeUndefined();
    expect(graph.edges()[0]).not.toHaveProperty('attributes');
    expect(graph.vertexAttributes(a)).toEqual({});
  });
});
