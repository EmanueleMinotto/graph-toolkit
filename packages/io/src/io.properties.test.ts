import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { arbGraph, arbPermutation, BRUTE_FORCE, described, relabel } from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  fromAdjacencyCsv,
  fromBinary,
  fromDimacs,
  fromDot,
  fromEdgeList,
  fromGexf,
  fromGml,
  fromGraph6,
  fromGraphMl,
  fromJson,
  fromPajek,
  fromSparse6,
  ParseError,
  toAdjacencyCsv,
  toBinary,
  toDimacs,
  toDot,
  toEdgeList,
  toGexf,
  toGml,
  toGraph6,
  toGraphMl,
  toJson,
  toPajek,
  toSparse6,
} from './index.js';

interface Format {
  readonly name: string;
  readonly write: (graph: Graph) => string | Uint8Array;
  readonly read: (data: never) => Graph;
}

const format = <T extends string | Uint8Array>(
  name: string,
  write: (graph: Graph) => T,
  read: (data: T) => Graph,
): Format => ({ name, write, read });

/** Everything a lossless format must preserve, in order. */
const shape = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges().map(({ source, target, weight }) => [source, target, weight]),
});

/** Same, but vertex names replaced by their insertion index (formats that renumber). */
const indexShape = (graph: Graph) => ({
  directed: graph.directed,
  count: graph.vertexCount,
  edges: graph
    .edges()
    .map(({ source, target, weight }) => [graph.indexOf(source), graph.indexOf(target), weight]),
});

const lossless = [
  format('json', toJson, fromJson),
  format('graphml', toGraphMl, fromGraphMl),
  format('gexf', toGexf, fromGexf),
  format('binary', toBinary, fromBinary),
  format('dot', toDot, fromDot),
  format('gml', toGml, fromGml),
];

// toPajek writes an empty graph as "*Vertices 0" but fromPajek rejects it: covered by a known-bug test below.
const renumbering = [
  { ...format('pajek', toPajek, fromPajek), minN: 1 },
  { ...format('dimacs', toDimacs, fromDimacs), minN: 0 },
];

// The readers build simple graphs, so parallel edges are out of scope.
const rich = { weighted: true, allowSelfLoops: true } as const;
const arbAny = fc.boolean().chain((directed) => arbGraph({ ...rich, directed }));
const arbSimpleUndirected = arbGraph({ weighted: false });
/** What `run` throws, if anything. */
const failureOf = (run: () => unknown): unknown => {
  try {
    run();

    return undefined;
  } catch (error) {
    return error;
  }
};

const isParseError = (failure: unknown): boolean =>
  failure === undefined || failure instanceof ParseError;

// Undirected endpoints come back in first-seen order, so compare them unordered.
const edgeKeys = (graph: Graph): string[] =>
  graph
    .edges()
    .map(({ source, target, weight }) => {
      const ends = graph.directed
        ? [source, target]
        : [source, target].toSorted((a, b) => a.localeCompare(b));

      return `${ends.join('>')}:${String(weight)}`;
    })
    .toSorted((a, b) => a.localeCompare(b));

const onlyParseErrors = (parse: (text: string) => Graph): fc.IPropertyWithHooks<[string]> =>
  fc.property(arbText, (text) => isParseError(failureOf(() => parse(text))));

const arbText = fc.oneof(
  fc.string({ maxLength: 60 }),
  fc.string({ unit: 'binary', maxLength: 30 }),
);

/** The graph with vertex k renamed `names[k]`. */
const withNames = (graph: Graph, names: readonly string[]): Graph => {
  const builder = new GraphBuilder({ directed: graph.directed });
  const rename = (id: string) => vertexId(names[graph.indexOf(vertexId(id))] ?? id);

  for (const id of graph.vertices()) {
    builder.addVertex(rename(id));
  }

  for (const { source, target, weight } of graph.edges()) {
    builder.addEdge(rename(source), rename(target), weight);
  }

  return described(builder.build());
};

/** A graph whose vertices carry awkward names: quotes, markup, backslashes, spaces, non-ASCII. */
const arbNamedGraph = arbAny.chain((graph) =>
  fc
    .uniqueArray(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 6 }),
        fc.string({ unit: 'grapheme', minLength: 1, maxLength: 4 }),
      ),
      {
        minLength: graph.vertexCount,
        maxLength: graph.vertexCount,
      },
    )
    .map((names) => withNames(graph, names)),
);

// DOT statements end at `;` or a line break, so its tests stay on one line.
const arbInlineSpace = fc.constantFrom(' ', '  ', '\t', ' \t');
const arbSpace = fc.constantFrom(' ', '  ', '\t', '\n', ' \n ', '\r\n');

/** Spaces and the gaps between tags become arbitrary whitespace (names here never contain either). */
const respaced = (text: string, spaces: readonly string[]): string => {
  let next = 0;
  const pick = () => spaces[next++ % spaces.length] ?? ' ';

  return text.replaceAll(/ |><|\n/gu, (match) => (match === '><' ? `>${pick()}<` : pick()));
};

interface LineNoise {
  readonly pad: string;
  readonly trail: string;
  readonly comment: string;
  readonly every: number;
  readonly eol: string;
}

const arbLineNoise = fc.record({
  pad: fc.constantFrom('', ' ', '\t', ' '.repeat(3)),
  trail: fc.constantFrom('', ' ', '\t'),
  comment: fc.stringMatching(/^[a-z0-9 ]{0,8}$/u),
  every: fc.integer({ min: 1, max: 3 }),
  eol: fc.constantFrom('\n', '\r\n'),
});

/** Pads lines, interleaves blank and comment lines (`marker` + text) and may switch to CRLF. */
const noisy = (
  text: string,
  marker: string,
  { pad, trail, comment, every, eol }: LineNoise,
): string =>
  text
    .split('\n')
    .flatMap((line, index) => [
      `${pad}${line}${trail}`,
      ...(index % every === 0 ? ['', `${marker}${comment}`] : []),
    ])
    .join(eol);

describe('io properties', () => {
  describe.each(lossless)('$name', ({ write, read }) => {
    it('round-trips vertices, edges, weights and direction', () => {
      fc.assert(
        fc.property(arbAny, (graph) => {
          expect(shape(read(write(graph) as never))).toEqual(shape(graph));
        }),
        BRUTE_FORCE,
      );
    });

    it('is idempotent: re-serialising a parsed document gives the same document', () => {
      fc.assert(
        fc.property(arbAny, (graph) => {
          const once = write(graph);

          expect(write(read(once as never))).toEqual(once);
        }),
      );
    });
  });

  describe.each(renumbering)('$name (renumbers vertices)', ({ write, read, minN }) => {
    it('preserves the structure by insertion index', () => {
      fc.assert(
        fc.property(
          fc.boolean().chain((directed) => arbGraph({ ...rich, directed, minN })),
          (graph) => {
            expect(indexShape(read(write(graph) as never))).toEqual(indexShape(graph));
          },
        ),
      );
    });
  });

  it('graph6 and sparse6 round-trip simple undirected graphs', () => {
    fc.assert(
      fc.property(arbSimpleUndirected, (graph) => {
        expect(indexShape(fromGraph6(toGraph6(graph)))).toEqual(indexShape(graph));
        expect(indexShape(fromSparse6(toSparse6(graph)))).toEqual(indexShape(graph));
      }),
      BRUTE_FORCE,
    );
  });

  it('edge list keeps every edge (only isolated vertices are lost)', () => {
    fc.assert(
      fc.property(arbAny, (graph) => {
        const back = fromEdgeList(toEdgeList(graph), { isDirected: graph.directed });
        const touched = new Set(graph.edges().flatMap(({ source, target }) => [source, target]));

        expect(edgeKeys(back)).toEqual(edgeKeys(graph));
        expect(back.vertexCount).toBe(touched.size);
      }),
    );
  });

  describe.each(lossless.filter(({ name }) => name !== 'dot'))('$name names', ({ write, read }) => {
    it('keeps awkward vertex names intact', () => {
      fc.assert(
        fc.property(arbNamedGraph, (graph) => {
          expect(shape(read(write(graph) as never))).toEqual(shape(graph));
        }),
      );
    });
  });

  // Known bug (fixed separately): fromDot is not quote-aware, so `#`, `//`, `;`, `=`, `[` in a name corrupt the graph.
  it.fails('dot keeps awkward vertex names intact', () => {
    fc.assert(
      fc.property(arbNamedGraph, (graph) => {
        expect(shape(fromDot(toDot(graph)))).toEqual(shape(graph));
      }),
    );
  });

  describe.each([
    { name: 'graphml', write: toGraphMl, read: fromGraphMl, space: arbSpace },
    { name: 'gexf', write: toGexf, read: fromGexf, space: arbSpace },
    { name: 'dot', write: toDot, read: fromDot, space: arbInlineSpace },
    { name: 'gml', write: toGml, read: fromGml, space: arbSpace },
  ])('$name whitespace', ({ write, read, space }) => {
    it('is insensitive to extra whitespace between tokens', () => {
      fc.assert(
        fc.property(arbAny, fc.array(space, { minLength: 1, maxLength: 5 }), (graph, spaces) => {
          const text = write(graph);

          expect(shape(read(respaced(text, spaces)))).toEqual(shape(read(text)));
        }),
      );
    });
  });

  describe.each([
    { name: 'dimacs', write: toDimacs, read: fromDimacs, marker: 'c' },
    {
      name: 'edge list',
      write: toEdgeList,
      read: (text: string) => fromEdgeList(text),
      marker: '# ',
    },
    { name: 'pajek', write: toPajek, read: fromPajek, marker: '% ' },
  ])('$name line noise', ({ write, read, marker }) => {
    it('ignores padding, blank lines, comments and CRLF', () => {
      fc.assert(
        fc.property(arbGraph({ ...rich, minN: 1 }), arbLineNoise, (graph, noise) => {
          const text = write(graph);

          expect(indexShape(read(noisy(text, marker, noise)))).toEqual(indexShape(read(text)));
        }),
      );
    });
  });

  it('graph6 and sparse6 round-trip around the 63-vertex size switch and accept their header', () => {
    fc.assert(
      fc.property(arbGraph({ minN: 60, maxN: 66 }), (graph) => {
        const [six, sparse] = [toGraph6(graph), toSparse6(graph)];

        expect(indexShape(fromGraph6(six))).toEqual(indexShape(graph));
        expect(indexShape(fromSparse6(sparse))).toEqual(indexShape(graph));
        expect(indexShape(fromGraph6(`>>graph6<<${six}`))).toEqual(indexShape(graph));
        expect(indexShape(fromSparse6(`>>sparse6<<${sparse}`))).toEqual(indexShape(graph));
      }),
      { numRuns: 30 },
    );
  });

  it('adjacency CSV round-trips simple weighted graphs by index', () => {
    fc.assert(
      fc.property(
        fc.boolean().chain((directed) => arbGraph({ directed, weighted: true })),
        (graph) => {
          const back = fromAdjacencyCsv(toAdjacencyCsv(graph), { isDirected: graph.directed });

          expect(indexShape(back)).toEqual(indexShape(graph));
        },
      ),
    );
  });

  it('serialising a relabelled graph equals relabelling the parsed original', () => {
    fc.assert(
      fc.property(
        arbAny.chain((graph) =>
          arbPermutation(graph.vertexCount).map((order) => [graph, order] as const),
        ),
        ([graph, order]) => {
          const renamed = relabel(graph, order);

          expect(shape(fromJson(toJson(renamed)))).toEqual(shape(renamed));
          expect(shape(relabel(fromJson(toJson(graph)), order))).toEqual(shape(renamed));
        },
      ),
    );
  });

  describe('parsers only ever fail with ParseError', () => {
    const parsers: readonly (readonly [string, (text: string) => Graph])[] = [
      ['graphml', fromGraphMl],
      ['gexf', fromGexf],
      ['dot', fromDot],
      ['gml', fromGml],
      ['pajek', fromPajek],
      ['dimacs', fromDimacs],
      ['edge list', (text) => fromEdgeList(text)],
      ['adjacency csv', (text) => fromAdjacencyCsv(text)],
      ['graph6', fromGraph6],
      ['sparse6', fromSparse6],
    ];

    it.each(parsers)('%s on arbitrary text', (_, parse) => {
      expect(() => {
        fc.assert(onlyParseErrors(parse));
      }).not.toThrow();
    });

    // fromJson lets JSON.parse's SyntaxError escape: known bug, fixed separately (move to the list above then).
    it.fails('json on arbitrary text', () => {
      expect(() => {
        fc.assert(onlyParseErrors(fromJson));
      }).not.toThrow();
    });

    it('binary on arbitrary bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ maxLength: 40 }), (bytes) => {
          expect(isParseError(failureOf(() => fromBinary(bytes)))).toBe(true);
        }),
      );
    });
  });

  // Known bug (fixed separately): the document toPajek writes for an empty graph is rejected by fromPajek.
  it.fails('pajek round-trips the empty graph', () => {
    const empty = new GraphBuilder().build();

    expect(fromPajek(toPajek(empty)).vertexCount).toBe(0);
  });
});
