import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BRUTE_FORCE } from '@graph-sdk/test-utils/runs';
import { DuplicateError, UnknownEdgeError, UnknownVertexError } from './errors.js';
import { GraphBuilder } from './graph-builder.js';
import { vertexId, type Edge, type Graph, type VertexId } from './types.js';

// This package cannot depend on @graph-sdk/test-utils (that one depends on core), so the generators
// are local and build graphs with the source GraphBuilder, which is what these tests exercise.

const SIZE = 5;
const name = (index: number): VertexId => vertexId(String(index));
const slot = fc.integer({ min: 0, max: SIZE - 1 });
const byText = (left: string, right: string): number => left.localeCompare(right);

type Kind = 'vertex' | 'edge' | 'unedge' | 'unvertex';

interface Op {
  readonly kind: Kind;
  readonly a: number;
  readonly b: number;
  readonly w: number;
}

interface Options {
  readonly directed: boolean;
  readonly allowParallelEdges: boolean;
}

/** Edges are added more often than anything else is done. */
const kinds: readonly Kind[] = [
  'vertex',
  'vertex',
  'vertex',
  'edge',
  'edge',
  'edge',
  'edge',
  'unedge',
  'unvertex',
];

const arbScript = fc.record({
  options: fc.record({ directed: fc.boolean(), allowParallelEdges: fc.boolean() }),
  ops: fc.array(
    fc.record({
      kind: fc.constantFrom(...kinds),
      a: slot,
      b: slot,
      w: fc.integer({ min: 1, max: 9 }),
    }),
    { maxLength: 40 },
  ),
});

// --- the reference model: a list of vertices and a list of edges ------------------------------

interface Arc {
  readonly from: number;
  readonly to: number;
  readonly w: number;
}

interface State {
  readonly vertices: readonly number[];
  readonly edges: readonly Arc[];
}

type ErrorClass = new (message: string) => Error;
type Step = readonly [State, ErrorClass | undefined];

const sameEnds = ({ directed }: Options, edge: Arc, { a, b }: Op): boolean => {
  const forward = edge.from === a && edge.to === b;
  const backward = !directed && edge.from === b && edge.to === a;

  return forward || backward;
};

const isKnown = (state: State, ...ids: readonly number[]): boolean =>
  ids.every((id) => state.vertices.includes(id));

const handlers: Record<Kind, (state: State, op: Op, options: Options) => Step> = {
  vertex: (state, op) =>
    state.vertices.includes(op.a)
      ? [state, DuplicateError]
      : [{ ...state, vertices: [...state.vertices, op.a] }, undefined],
  edge: (state, op, options) => {
    const clash = state.edges.some((edge) => sameEnds(options, edge, op));

    if (!isKnown(state, op.a, op.b)) {
      return [state, UnknownVertexError];
    }

    return clash && !options.allowParallelEdges
      ? [state, DuplicateError]
      : [{ ...state, edges: [...state.edges, { from: op.a, to: op.b, w: op.w }] }, undefined];
  },
  unedge: (state, op, options) => {
    const kept = state.edges.filter((edge) => !sameEnds(options, edge, op));

    if (!isKnown(state, op.a, op.b)) {
      return [state, UnknownVertexError];
    }

    return kept.length === state.edges.length
      ? [state, UnknownEdgeError]
      : [{ ...state, edges: kept }, undefined];
  },
  unvertex: (state, op) =>
    isKnown(state, op.a)
      ? [
          {
            vertices: state.vertices.filter((id) => id !== op.a),
            edges: state.edges.filter((edge) => edge.from !== op.a && edge.to !== op.a),
          },
          undefined,
        ]
      : [state, UnknownVertexError],
};

const endsOf = (directed: boolean, first: string, second: string): string[] =>
  directed ? [first, second] : [first, second].toSorted((x, y) => Number(x) - Number(y));

const shapeOf = (directed: boolean, vertices: readonly string[], edges: readonly Edge[]) => ({
  vertices: [...vertices],
  edges: edges
    .map(
      ({ source, target, weight }) =>
        `${endsOf(directed, source, target).join('>')}:${String(weight)}`,
    )
    .toSorted(byText),
});

const shapeOfState = (state: State, { directed }: Options) =>
  shapeOf(
    directed,
    state.vertices.map(String),
    state.edges.map(({ from, to, w }) => ({ source: name(from), target: name(to), weight: w })),
  );

const shapeOfGraph = (graph: Graph) => shapeOf(graph.directed, graph.vertices(), graph.edges());

// --- running the real builder -----------------------------------------------------------------

const apply = (builder: GraphBuilder, { kind, a, b, w }: Op): void => {
  const actions: Record<Kind, () => GraphBuilder> = {
    vertex: () => builder.addVertex(name(a)),
    edge: () => builder.addEdge(name(a), name(b), w),
    unedge: () => builder.removeEdge(name(a), name(b)),
    unvertex: () => builder.removeVertex(name(a)),
  };

  actions[kind]();
};

const failureOf = (action: () => void): unknown => {
  try {
    action();

    return undefined;
  } catch (error) {
    return error;
  }
};

/** Builds a graph from a script, skipping the operations the builder rejects. */
function buildFrom({ options, ops }: { options: Options; ops: readonly Op[] }): Graph {
  const builder = new GraphBuilder(options);

  for (const op of ops) {
    failureOf(() => {
      apply(builder, op);
    });
  }

  return builder.build();
}

describe('core properties', () => {
  it('GraphBuilder behaves like a plain list of vertices and edges, errors included', () => {
    fc.assert(
      fc.property(arbScript, ({ options, ops }) => {
        const builder = new GraphBuilder(options);
        let state: State = { vertices: [], edges: [] };

        for (const op of ops) {
          const [next, expected] = handlers[op.kind](state, op, options);
          const failure = failureOf(() => {
            apply(builder, op);
          });

          expect((failure as Error | undefined)?.constructor).toBe(expected);
          expect(shapeOfGraph(builder.build())).toEqual(shapeOfState(next, options));
          state = next;
        }
      }),
      BRUTE_FORCE,
    );
  });

  it('keeps the CSR consistent: monotone offsets, in-range targets, one or two arcs per edge', () => {
    fc.assert(
      fc.property(arbScript, (script) => {
        const graph = buildFrom(script);
        const { offsets, targets, weights } = graph.csr;
        const loops = graph.edges().filter(({ source, target }) => source === target).length;
        const arcs = graph.directed ? graph.edgeCount : 2 * graph.edgeCount - loops;

        expect(offsets).toHaveLength(graph.vertexCount + 1);

        expect(offsets.every((value, index) => index === 0 || value >= offsets[index - 1]!)).toBe(
          true,
        );

        expect(offsets.at(-1)).toBe(targets.length);
        expect(weights).toHaveLength(targets.length);
        expect(targets.every((target) => target < graph.vertexCount)).toBe(true);
        expect(targets).toHaveLength(arcs);
      }),
    );
  });

  it('answers adjacency questions consistently with the edge list', () => {
    fc.assert(
      fc.property(arbScript, (script) => {
        const graph = buildFrom(script);
        const linking = (from: VertexId, to: VertexId): Edge[] =>
          graph.edges().filter((edge) => {
            const forward = edge.source === from && edge.target === to;

            return forward || (!graph.directed && edge.source === to && edge.target === from);
          });

        for (const from of graph.vertices()) {
          for (const to of graph.vertices()) {
            expect(graph.hasEdge(from, to)).toBe(linking(from, to).length > 0);
            expect(graph.edgesBetween(from, to)).toHaveLength(linking(from, to).length);
          }

          expect(graph.degree(from)).toBe(graph.neighbors(from).length);
          expect(graph.vertexAt(graph.indexOf(from))).toBe(from);
        }
      }),
    );
  });

  it('GraphBuilder.from(graph).build() reproduces the graph', () => {
    fc.assert(
      fc.property(arbScript, (script) => {
        const graph = buildFrom(script);
        const copy = GraphBuilder.from(graph).build();

        expect(copy.directed).toBe(graph.directed);
        expect(copy.vertices()).toEqual(graph.vertices());
        expect(copy.edges()).toEqual(graph.edges());
      }),
    );
  });

  it('removing a vertex from a copy drops it and its edges, or fails if it is unknown', () => {
    fc.assert(
      fc.property(arbScript, slot, (script, victim) => {
        const full = buildFrom(script);
        const target = name(victim);
        const known = full.hasVertex(target);
        const failure = failureOf(() => GraphBuilder.from(full).removeVertex(target));
        const without = known ? GraphBuilder.from(full).removeVertex(target).build() : full;
        const touching = full
          .edges()
          .filter((edge) => edge.source === target || edge.target === target);

        expect((failure as Error | undefined)?.constructor).toBe(
          known ? undefined : UnknownVertexError,
        );

        expect(without.vertices()).toEqual(full.vertices().filter((id) => id !== target));
        expect(without.edgeCount).toBe(full.edgeCount - touching.length);
      }),
    );
  });

  it('adjacency does not depend on the order edges were added', () => {
    const arbPairs = fc.uniqueArray(fc.tuple(slot, slot), {
      selector: ([a, b]) => `${String(Math.min(a, b))}:${String(Math.max(a, b))}`,
    });

    fc.assert(
      fc.property(arbPairs, fc.boolean(), (pairs, directed) => {
        const make = (list: readonly (readonly [number, number])[]): Graph => {
          const builder = new GraphBuilder({ directed });

          for (let index = 0; index < SIZE; index++) {
            builder.addVertex(name(index));
          }

          for (const [a, b] of list) {
            builder.addEdge(name(a), name(b));
          }

          return builder.build();
        };
        const forward = make(pairs);
        const backward = make(pairs.toReversed());

        expect(shapeOfGraph(backward)).toEqual(shapeOfGraph(forward));

        expect(backward.vertices().map((id) => backward.degree(id))).toEqual(
          forward.vertices().map((id) => forward.degree(id)),
        );
      }),
    );
  });
});
