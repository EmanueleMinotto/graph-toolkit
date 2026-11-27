import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import {
  fromBinary,
  fromGraph6,
  fromJson,
  fromSparse6,
  toBinary,
  toGraph6,
  toSparse6,
} from './index.js';

const [a, b] = [vertexId('a'), vertexId('b')] as const;

const pair = (directed = false): Graph =>
  new GraphBuilder({ directed }).addVertex(a).addVertex(b).addEdge(a, b, 2).build();

const withVertices = (count: number): Graph => {
  const builder = new GraphBuilder();

  for (let index = 0; index < count; index++) {
    builder.addVertex(vertexId(String(index)));
  }

  return builder.build();
};

describe('binary errors', () => {
  const bytes = toBinary(pair());
  const header = (...rest: number[]): Uint8Array => new Uint8Array([...bytes.slice(0, 4), ...rest]);

  it('words every malformed input', () => {
    const wrongSignature = Uint8Array.from(bytes);

    wrongSignature[0] = wrongSignature[0]! ^ 0xff;

    expect(() => fromBinary(wrongSignature)).toThrow(
      'Not a graph-toolkit binary graph (bad signature or version)',
    );

    expect(() => fromBinary(header(2))).toThrow('Unknown flags in binary graph');
    expect(() => fromBinary(header())).toThrow('Unexpected end of binary graph');

    expect(() => fromBinary(header(0, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80))).toThrow(
      'Number too large in binary graph',
    );

    expect(() => fromBinary(header(0, 2, 5))).toThrow(
      'Binary graph is shorter than its header claims',
    );

    expect(() => fromBinary(header(0, 2, 0, 1, 97, 1, 97))).toThrow(
      'Duplicate vertex in binary graph',
    );

    expect(() => fromBinary(header(0, 1, 0, 1, 0xff))).toThrow('Invalid UTF-8 in binary graph');

    expect(() => fromBinary(header(0, 1, 1, 1, 97, 5, 0, 0))).toThrow(
      'Invalid edge in binary graph',
    );

    expect(() => fromBinary(header(0, 1, 1, 1, 97, 0, 0, 9))).toThrow(
      'Invalid edge in binary graph',
    );

    expect(() => fromBinary(new Uint8Array([...bytes, 0]))).toThrow(
      'Unexpected data after binary graph',
    );
  });

  it('round-trips a header whose edge bytes only just fit', () => {
    expect(fromBinary(bytes).edgeCount).toBe(1);

    const weights = new GraphBuilder().addVertex(a).addEdge(a, a, 1.5).build();

    expect(fromBinary(toBinary(weights)).edges()[0]?.weight).toBe(1.5);
  });

  it('round-trips names longer than the initial buffer', () => {
    const long = vertexId('v'.repeat(500));
    const graph = new GraphBuilder().addVertex(long).addVertex(a).addEdge(long, a, 0.25).build();

    expect(fromBinary(toBinary(graph)).edges()).toEqual(graph.edges());
  });
});

describe('graph6 and sparse6', () => {
  it('words graph6 problems', () => {
    expect(() => toGraph6(pair(true))).toThrow(
      new GraphError('graph6 requires an undirected graph'),
    );

    expect(() => toGraph6(new GraphBuilder().addVertex(a).addEdge(a, a).build())).toThrow(
      'graph6 does not support self-loops',
    );

    expect(() => fromGraph6('')).toThrow('Invalid graph6 header');
    expect(() => fromGraph6('\u{1}')).toThrow('Invalid graph6 header');
    expect(() => fromGraph6('\u{7F}')).toThrow('Invalid graph6 header');
    expect(() => fromGraph6('~A')).toThrow('Invalid graph6 header');
    expect(() => fromGraph6('C')).toThrow('graph6 body has the wrong length');
  });

  it('writes and reads the largest one-character order', () => {
    const encoded = toGraph6(withVertices(62));

    expect(encoded.startsWith('}')).toBe(true);
    expect(fromGraph6(encoded).vertexCount).toBe(62);
    expect(toGraph6(withVertices(63)).startsWith('~')).toBe(true);
    expect(fromGraph6('>>graph6<<A_').edgeCount).toBe(1);
  });

  it('words sparse6 problems', () => {
    expect(() => toSparse6(pair(true))).toThrow('sparse6 requires an undirected graph');

    expect(() => toSparse6(new GraphBuilder().addVertex(a).addEdge(a, a).build())).toThrow(
      'sparse6 here does not support self-loops',
    );

    expect(() => fromSparse6('abc')).toThrow('sparse6 text must start with ":"');
  });

  it('round-trips sparse6 with a prefix and several edges', () => {
    const star = new GraphBuilder();

    for (let index = 0; index < 6; index++) {
      star.addVertex(vertexId(String(index)));
    }

    for (const [from, to] of [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [4, 5],
      [0, 5],
    ] as const) {
      star.addEdge(vertexId(String(from)), vertexId(String(to)));
    }

    const graph = star.build();
    const back = fromSparse6(`>>sparse6<<${toSparse6(graph)}`);

    expect(back.edgeCount).toBe(6);
    expect(back.hasEdge(vertexId('4'), vertexId('5'))).toBe(true);
    expect(back.hasEdge(vertexId('3'), vertexId('4'))).toBe(false);
  });
});

const valid = { directed: false, vertices: ['a', 'b'], edges: [{ source: 'a', target: 'b' }] };

const messageOf = (document: unknown): string => {
  try {
    fromJson(JSON.stringify(document));
  } catch (error) {
    return (error as Error).message;
  }

  return '';
};

describe('JSON validation', () => {
  it('accepts the documented shape', () => {
    expect(fromJson(JSON.stringify(valid)).edgeCount).toBe(1);

    const rich = {
      ...valid,
      edges: [{ source: 'a', target: 'b', weight: 3, attributes: { kind: 'x', n: 1, ok: true } }],
      vertexAttributes: { a: { label: 'A' } },
    };

    expect(fromJson(JSON.stringify(rich)).vertexAttributes(a)).toEqual({ label: 'A' });
  });

  it('rejects every malformed part', () => {
    expect(messageOf(null)).toBe('Invalid graph JSON document');
    expect(messageOf([])).toBe('Invalid graph JSON document');
    expect(messageOf({ ...valid, directed: 'no' })).toBe('Invalid graph JSON document');
    expect(messageOf({ vertices: [], edges: [] })).toBe('Invalid graph JSON document');
    expect(messageOf({ ...valid, vertices: ['a', 1] })).toBe('Invalid graph JSON document');
    expect(messageOf({ ...valid, vertices: 'a' })).toBe('Invalid graph JSON document');
    expect(messageOf({ ...valid, edges: {} })).toBe('Invalid graph JSON document');

    expect(
      messageOf({
        ...valid,
        edges: [
          { source: 'a', target: 'b' },
          { source: 1, target: 'b' },
        ],
      }),
    ).toBe('Invalid graph JSON document');

    expect(messageOf({ ...valid, edges: [{ source: 'a', target: 'b' }, 7] })).toBe(
      'Invalid graph JSON document',
    );

    expect(messageOf({ ...valid, edges: [{ source: 'a' }] })).toBe('Invalid graph JSON document');
    expect(messageOf({ ...valid, edges: [{ target: 'b' }] })).toBe('Invalid graph JSON document');

    expect(messageOf({ ...valid, edges: [{ source: 1, target: 'b' }] })).toBe(
      'Invalid graph JSON document',
    );

    expect(messageOf({ ...valid, edges: [{ source: 'a', target: 1 }] })).toBe(
      'Invalid graph JSON document',
    );

    expect(messageOf({ ...valid, edges: [{ source: 'a', target: 'b', weight: 'heavy' }] })).toBe(
      'Invalid graph JSON document',
    );

    expect(
      messageOf({ ...valid, edges: [{ source: 'a', target: 'b', attributes: { k: {} } }] }),
    ).toBe('Invalid graph JSON document');

    expect(
      messageOf({ ...valid, edges: [{ source: 'a', target: 'b', attributes: { k: 1, j: {} } }] }),
    ).toBe('Invalid graph JSON document');

    expect(messageOf({ ...valid, edges: [{ source: 'a', target: 'b', attributes: [] }] })).toBe(
      'Invalid graph JSON document',
    );

    expect(messageOf({ ...valid, vertexAttributes: { a: 1 } })).toBe('Invalid graph JSON document');

    expect(messageOf({ ...valid, vertexAttributes: { a: { k: 1 }, b: 5 } })).toBe(
      'Invalid graph JSON document',
    );

    expect(messageOf({ ...valid, vertexAttributes: { a: { k: {} } } })).toBe(
      'Invalid graph JSON document',
    );
  });
});
