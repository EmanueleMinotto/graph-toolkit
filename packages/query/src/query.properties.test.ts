import {
  GraphBuilder,
  GraphError,
  UnknownVertexError,
  vertexId,
  type Attributes,
  type AttributeValue,
  type Edge,
  type Graph,
  type VertexId,
} from '@graph-sdk/core';
import { arbGraph, BRUTE_FORCE, canonical } from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { filterEdges, selectVertices } from './index.js';

const arbValue: fc.Arbitrary<AttributeValue> = fc.constantFrom(
  'red',
  'blue',
  1,
  2,
  true,
  false,
  '1',
);
const arbAttributes: fc.Arbitrary<Attributes | undefined> = fc.option(
  fc.record({ color: arbValue }, { requiredKeys: [] }),
  { nil: undefined },
);

/** A graph (parallel edges allowed) whose vertices and edges carry random `color` attributes. */
const arbAttributed = fc
  .boolean()
  .chain((directed) =>
    arbGraph({ directed, weighted: true, allowSelfLoops: true, allowParallelEdges: true }),
  )
  .chain((graph) =>
    fc
      .tuple(
        fc.array(arbAttributes, { minLength: graph.vertexCount, maxLength: graph.vertexCount }),
        fc.array(arbAttributes, { minLength: graph.edgeCount, maxLength: graph.edgeCount }),
      )
      .map(([vertexData, edgeData]) => {
        const builder = new GraphBuilder({ directed: graph.directed, allowParallelEdges: true });

        for (const [index, id] of graph.vertices().entries()) {
          builder.addVertex(id, vertexData[index]);
        }

        for (const [index, { source, target, weight }] of graph.edges().entries()) {
          builder.addEdge(source, target, {
            weight,
            ...(edgeData[index] && { attributes: edgeData[index] }),
          });
        }

        return builder.build();
      }),
  );

const arbSelection = arbAttributed.chain((graph) =>
  fc.tuple(fc.constant(graph), fc.subarray([...graph.vertices()])),
);

const byText = (left: string, right: string): number => left.localeCompare(right);

const arbHops = fc.integer({ min: 0, max: 5 });

/** Vertices within `hops` outgoing edges of `start`, by plain breadth-first levels. */
function withinHops(graph: Graph, start: readonly VertexId[], hops: number): Set<VertexId> {
  let seen = new Set(start);

  for (let level = 0; level < hops; level++) {
    seen = new Set([
      ...seen,
      ...[...seen].flatMap((id) => graph.neighbors(id).map(({ target }) => target)),
    ]);
  }

  return seen;
}

const inGraphOrder = (graph: Graph, wanted: ReadonlySet<VertexId>): VertexId[] =>
  graph.vertices().filter((id) => wanted.has(id));

const failureOf = (action: () => void): unknown => {
  try {
    action();

    return undefined;
  } catch (error) {
    return error;
  }
};

const describeEdges = (edges: readonly Edge[]): string[] =>
  edges
    .map(({ source, target, weight, attributes }) =>
      JSON.stringify([source, target, weight, attributes ?? null]),
    )
    .toSorted(byText);

describe('query properties', () => {
  describe('VertexQuery', () => {
    it('within(k) is the set of vertices at most k outgoing hops away', () => {
      fc.assert(
        fc.property(arbSelection, arbHops, ([graph, start], hops) => {
          const reached = selectVertices(graph, start).within(hops).ids();

          expect(reached).toEqual(inGraphOrder(graph, withinHops(graph, start, hops)));
        }),
        BRUTE_FORCE,
      );
    });

    it('within is monotone, within(0) is the selection and within(a).within(b) = within(a + b)', () => {
      fc.assert(
        fc.property(arbSelection, arbHops, arbHops, ([graph, start], first, second) => {
          const query = selectVertices(graph, start);
          const chained = query.within(first).within(second).ids();

          expect(query.within(0).ids()).toEqual(inGraphOrder(graph, new Set(start)));
          expect(chained).toEqual(query.within(first + second).ids());

          expect(query.within(first + 1).ids()).toEqual(
            expect.arrayContaining([...query.within(first).ids()]),
          );
        }),
      );
    });

    it('neighbors() are the out-neighbours of the selection, in graph order', () => {
      fc.assert(
        fc.property(arbSelection, ([graph, start]) => {
          const targets = new Set(
            start.flatMap((id) => graph.neighbors(id).map(({ target }) => target)),
          );

          expect(selectVertices(graph, start).neighbors().ids()).toEqual(
            inGraphOrder(graph, targets),
          );
        }),
      );
    });

    it('where() composes: chaining equals conjunction, and a predicate and its negation partition the selection', () => {
      fc.assert(
        fc.property(
          arbSelection,
          fc.integer({ min: 0, max: 7 }),
          fc.integer({ min: 0, max: 7 }),
          ([graph, start], low, high) => {
            const query = selectVertices(graph, start);
            const small = (id: string): boolean => Number(id) >= low;
            const large = (id: string): boolean => Number(id) <= high;
            const kept = query
              .where((id) => small(id))
              .where((id) => large(id))
              .ids();
            const dropped = query.where((id) => !small(id)).ids();

            expect(kept).toEqual(query.where((id) => small(id) && large(id)).ids());

            expect([...query.where((id) => small(id)).ids(), ...dropped].toSorted(byText)).toEqual(
              start.toSorted(byText),
            );

            expect(query.where(() => true).ids()).toEqual(start);
          },
        ),
      );
    });

    it('withAttribute(key[, value]) keeps vertices with that attribute, comparing values strictly', () => {
      fc.assert(
        fc.property(arbAttributed, fc.option(arbValue, { nil: undefined }), (graph, value) => {
          const has = (id: VertexId): boolean => Object.hasOwn(graph.vertexAttributes(id), 'color');
          const matching = graph
            .vertices()
            .filter(
              (id) =>
                has(id) && (value === undefined || graph.vertexAttributes(id)['color'] === value),
            );

          expect(selectVertices(graph).withAttribute('color', value).ids()).toEqual(matching);
          expect(selectVertices(graph).withAttribute('missing').count()).toBe(0);
        }),
      );
    });

    it('subgraph() is the induced subgraph, attributes included; selecting everything gives the graph back', () => {
      fc.assert(
        fc.property(arbSelection, ([graph, start]) => {
          const chosen = new Set(start);
          const sub = selectVertices(graph, start).subgraph();
          const inside = graph
            .edges()
            .filter(({ source, target }) => chosen.has(source) && chosen.has(target));
          const whole = selectVertices(graph).subgraph();

          expect(sub.vertices()).toEqual(start);
          expect(describeEdges(sub.edges())).toEqual(describeEdges(inside));

          expect(describeEdges(selectVertices(graph, start).edges())).toEqual(
            describeEdges(inside),
          );

          expect(
            start.every(
              (id) =>
                JSON.stringify(sub.vertexAttributes(id)) ===
                JSON.stringify(graph.vertexAttributes(id)),
            ),
          ).toBe(true);

          expect(canonical(whole)).toEqual(canonical(graph));
          expect(describeEdges(whole.edges())).toEqual(describeEdges(graph.edges()));
        }),
      );
    });

    it('rejects unknown vertices and invalid hop counts', () => {
      fc.assert(
        fc.property(
          arbAttributed,
          fc.oneof(
            fc.integer({ min: -5, max: -1 }),
            fc.double({ min: 0.1, max: 3, noInteger: true }),
            fc.constant(NaN),
          ),
          (graph, hops) => {
            const unknown = vertexId(`missing-${String(graph.vertexCount)}`);

            expect(failureOf(() => selectVertices(graph, [unknown]))).toBeInstanceOf(
              UnknownVertexError,
            );

            expect(failureOf(() => selectVertices(graph).within(hops))).toBeInstanceOf(GraphError);
          },
        ),
      );
    });
  });

  describe('filterEdges', () => {
    it('keeps every vertex with its attributes and exactly the accepted edges, attributes and weights included', () => {
      fc.assert(
        fc.property(arbAttributed, fc.integer({ min: 1, max: 9 }), (graph, threshold) => {
          const keep = (edge: Edge): boolean => edge.weight >= threshold;
          const result = filterEdges(graph, keep);

          expect(result.directed).toBe(graph.directed);
          expect(result.vertices()).toEqual(graph.vertices());

          expect(
            graph
              .vertices()
              .every(
                (id) =>
                  JSON.stringify(result.vertexAttributes(id)) ===
                  JSON.stringify(graph.vertexAttributes(id)),
              ),
          ).toBe(true);

          expect(describeEdges(result.edges())).toEqual(
            describeEdges(graph.edges().filter((edge) => keep(edge))),
          );
        }),
        BRUTE_FORCE,
      );
    });

    it('keeping everything or nothing, filtering twice, and a predicate with its negation behave like set operations', () => {
      fc.assert(
        fc.property(arbAttributed, fc.integer({ min: 1, max: 9 }), (graph, threshold) => {
          const heavy = (edge: Edge): boolean => edge.weight >= threshold;
          const light = (edge: Edge): boolean => !heavy(edge);
          const parts = [
            ...filterEdges(graph, heavy).edges(),
            ...filterEdges(graph, light).edges(),
          ];

          expect(describeEdges(filterEdges(graph, () => true).edges())).toEqual(
            describeEdges(graph.edges()),
          );

          expect(filterEdges(graph, () => false).edgeCount).toBe(0);

          expect(describeEdges(filterEdges(filterEdges(graph, heavy), heavy).edges())).toEqual(
            describeEdges(filterEdges(graph, heavy).edges()),
          );

          expect(describeEdges(parts)).toEqual(describeEdges(graph.edges()));
        }),
      );
    });
  });
});
