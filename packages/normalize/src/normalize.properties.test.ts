import { GraphBuilder, GraphError, vertexId, type Graph, type VertexId } from '@graph-sdk/core';
import {
  arbGraph,
  arbPermutation,
  BRUTE_FORCE,
  canonical,
  relabel as renamed,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  assertValidGraph,
  canonicalize,
  reindex,
  relabel,
  removeSelfLoops,
  validateGraph,
  ValidationError,
  type GraphSchema,
  type ValidationIssue,
  type WeightRule,
} from './index.js';

const byText = (left: string, right: string): number => left.localeCompare(right);
const arbRich = fc
  .boolean()
  .chain((directed) => arbGraph({ directed, weighted: true, allowSelfLoops: true }));

/** Exactly what `canonicalize` promises to be equal for equal graphs: ordered content, not just sets. */
const ordered = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges().map(({ source, target, weight }) => [source, target, weight]),
});

/** The same graph written differently: vertices and edges shuffled, undirected endpoints flipped. */
const arbRewritten = arbRich.chain((graph) =>
  fc
    .tuple(
      fc.shuffledSubarray([...graph.vertices()], { minLength: graph.vertexCount }),
      fc.shuffledSubarray([...graph.edges()], { minLength: graph.edgeCount }),
      fc.boolean(),
    )
    .map(([vertices, edges, flip]) => {
      const builder = new GraphBuilder({ directed: graph.directed });

      for (const id of vertices) {
        builder.addVertex(id);
      }

      for (const { source, target, weight } of edges) {
        const swap = flip && !graph.directed;

        builder.addEdge(swap ? target : source, swap ? source : target, weight);
      }

      return [graph, builder.build()] as const;
    }),
);

const failureOf = (action: () => void): unknown => {
  try {
    action();

    return undefined;
  } catch (error) {
    return error;
  }
};

const name = (index: number): VertexId => vertexId(String(index));

const codes = (issues: readonly ValidationIssue[]): string[] => issues.map(({ code }) => code);

/** Number of weakly connected components (union-find written out here, not taken from the library). */
function componentCount(graph: Graph): number {
  const parent = new Map<string, string>(graph.vertices().map((id) => [id, id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));

  for (const { source, target } of graph.edges()) {
    parent.set(find(source), find(target));
  }

  return new Set(graph.vertices().map((id) => find(id))).size;
}

const hasLoop = (graph: Graph): boolean =>
  graph.edges().some((edge) => edge.source === edge.target);

const hasIsolated = (graph: Graph): boolean => {
  const touched = new Set(graph.edges().flatMap(({ source, target }) => [source, target]));

  return graph.vertices().some((id) => !touched.has(id));
};

const outOfRange = (
  graph: Graph,
  { min = -Infinity, max = Infinity, isInteger = false }: WeightRule,
): boolean =>
  graph
    .edges()
    .some(
      ({ weight }) => weight < min || weight > max || (isInteger && !Number.isSafeInteger(weight)),
    );

/** An independent statement of what each rule means, in the library's rule order. */
const RULES: readonly (readonly [string, (graph: Graph, schema: GraphSchema) => boolean])[] = [
  ['direction', (graph, { directed }) => directed !== undefined && directed !== graph.directed],
  ['self-loop', (graph, { allowSelfLoops }) => allowSelfLoops === false && hasLoop(graph)],
  ['isolated-vertex', (graph, { allowIsolated }) => allowIsolated === false && hasIsolated(graph)],
  [
    'disconnected',
    (graph, { connected }) =>
      connected === true && graph.vertexCount >= 2 && componentCount(graph) > 1,
  ],
  [
    'too-many-vertices',
    (graph, { maxVertices }) => maxVertices !== undefined && graph.vertexCount > maxVertices,
  ],
  ['too-many-edges', (graph, { maxEdges }) => maxEdges !== undefined && graph.edgeCount > maxEdges],
  [
    'vertex-id',
    (graph, { vertexIdPattern }) =>
      graph.vertices().some((id) => vertexIdPattern?.test(id) === false),
  ],
  ['weight', (graph, { weight }) => weight !== undefined && outOfRange(graph, weight)],
];

const expectedCodes = (graph: Graph, schema: GraphSchema): string[] =>
  RULES.filter(([, violated]) => violated(graph, schema)).map(([code]) => code);

describe('normalize properties', () => {
  describe('canonicalize', () => {
    it('is idempotent', () => {
      fc.assert(
        fc.property(arbRich, (graph) => {
          expect(ordered(canonicalize(canonicalize(graph)))).toEqual(ordered(canonicalize(graph)));
        }),
        BRUTE_FORCE,
      );
    });

    it('gives the same graph for every way of writing it down', () => {
      fc.assert(
        fc.property(arbRewritten, ([graph, rewritten]) => {
          expect(ordered(canonicalize(rewritten))).toEqual(ordered(canonicalize(graph)));
        }),
        BRUTE_FORCE,
      );
    });

    it('keeps the content and sorts vertices and edges', () => {
      fc.assert(
        fc.property(arbRich, (graph) => {
          const result = canonicalize(graph);
          const keys = result.edges().map(({ source, target }) => `${source}\0${target}`);

          expect(canonical(result)).toEqual(canonical(graph));
          expect(result.vertices()).toEqual(result.vertices().toSorted(byText));
          expect(keys).toEqual(keys.toSorted(byText));

          expect(
            result.directed || result.edges().every((edge) => edge.source <= edge.target),
          ).toBe(true);
        }),
      );
    });
  });

  describe('relabel and reindex', () => {
    it('reindex numbers vertices by position, keeping the structure, and is idempotent', () => {
      fc.assert(
        fc.property(arbRich, (graph) => {
          const result = reindex(graph);
          const position = (id: VertexId): number => graph.indexOf(id);

          expect(result.vertices()).toEqual(graph.vertices().map((_, index) => name(index)));

          expect(
            result
              .edges()
              .map(({ source, target, weight }) => [Number(source), Number(target), weight]),
          ).toEqual(
            graph
              .edges()
              .map(({ source, target, weight }) => [position(source), position(target), weight]),
          );

          expect(ordered(reindex(result))).toEqual(ordered(result));
        }),
      );
    });

    it('a permutation of the ids matches test-utils relabelling and can be undone', () => {
      fc.assert(
        fc.property(
          arbRich.chain((graph) =>
            arbPermutation(graph.vertexCount).map((order) => [graph, order] as const),
          ),
          ([graph, order]) => {
            const moved = relabel(graph, (id) => name(order[Number(id)]!));
            const back = relabel(moved, (id) => name(order.indexOf(Number(id))));

            expect(canonical(moved)).toEqual(canonical(renamed(graph, order)));
            expect(ordered(back)).toEqual(ordered(graph));
          },
        ),
      );
    });

    it('rejects a renaming that merges two vertices', () => {
      fc.assert(
        fc.property(arbGraph({ minN: 2 }), (graph) => {
          expect(() => relabel(graph, () => name(0))).toThrow(GraphError);
        }),
      );
    });
  });

  describe('removeSelfLoops', () => {
    it('drops exactly the loops, keeps every vertex, and is idempotent', () => {
      fc.assert(
        fc.property(arbRich, (graph) => {
          const result = removeSelfLoops(graph);
          const kept = graph.edges().filter(({ source, target }) => source !== target);

          expect(result.vertices()).toEqual(graph.vertices());

          expect(ordered(result).edges).toEqual(
            kept.map(({ source, target, weight }) => [source, target, weight]),
          );

          expect(ordered(removeSelfLoops(result))).toEqual(ordered(result));
        }),
      );
    });
  });

  describe('validateGraph', () => {
    const arbBound = fc.option(fc.double({ min: -2, max: 12, noNaN: true }), { nil: undefined });
    const arbSchema: fc.Arbitrary<GraphSchema> = fc.record(
      {
        directed: fc.boolean(),
        allowSelfLoops: fc.boolean(),
        allowIsolated: fc.boolean(),
        connected: fc.boolean(),
        maxVertices: fc.integer({ min: 0, max: 8 }),
        maxEdges: fc.integer({ min: 0, max: 20 }),
        vertexIdPattern: fc.constantFrom(/^[0-3]$/u, /^[5-7]$/u, /^\d$/u),
        weight: fc.record(
          { min: arbBound, max: arbBound, isInteger: fc.boolean() },
          { requiredKeys: [] },
        ),
      },
      { requiredKeys: [] },
    );

    it('reports exactly the violated constraints, in rule order', () => {
      fc.assert(
        fc.property(arbRich, arbSchema, (graph, schema) => {
          expect(codes(validateGraph(graph, schema))).toEqual(expectedCodes(graph, schema));
        }),
        BRUTE_FORCE,
      );
    });

    it('names the offending vertices of loops, isolated vertices and bad ids', () => {
      fc.assert(
        fc.property(arbRich, (graph) => {
          const issues = validateGraph(graph, {
            allowSelfLoops: false,
            allowIsolated: false,
            vertexIdPattern: /^[0-2]$/u,
          });
          const named = (code: string): VertexId[] =>
            issues.find((found) => found.code === code)?.vertices.toSorted(byText) ?? [];
          const touched = new Set(graph.edges().flatMap(({ source, target }) => [source, target]));

          expect(named('isolated-vertex')).toEqual(
            graph
              .vertices()
              .filter((id) => !touched.has(id))
              .toSorted(byText),
          );

          expect(named('vertex-id')).toEqual(
            graph
              .vertices()
              .filter((id) => Number(id) > 2)
              .toSorted(byText),
          );

          expect(new Set(named('self-loop'))).toEqual(
            new Set(
              graph
                .edges()
                .filter((edge) => edge.source === edge.target)
                .map((edge) => edge.source),
            ),
          );
        }),
      );
    });

    it('assertValidGraph throws a ValidationError carrying the same issues, exactly when there are some', () => {
      fc.assert(
        fc.property(arbRich, arbSchema, (graph, schema) => {
          const issues = validateGraph(graph, schema);
          const failure = failureOf(() => {
            assertValidGraph(graph, schema);
          });

          expect(failure instanceof ValidationError).toBe(issues.length > 0);
          expect((failure as ValidationError | undefined)?.issues ?? []).toEqual(issues);
        }),
      );
    });

    it('does not depend on how the vertices are named, apart from the id pattern', () => {
      fc.assert(
        fc.property(
          arbRich.chain((graph) =>
            arbPermutation(graph.vertexCount).map((order) => [graph, order] as const),
          ),
          arbSchema,
          ([graph, order], schema) => {
            const rest: GraphSchema = { ...schema, vertexIdPattern: undefined };
            const moved = renamed(graph, order);

            expect(codes(validateGraph(moved, rest))).toEqual(codes(validateGraph(graph, rest)));
          },
        ),
      );
    });
  });
});
