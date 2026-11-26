import type { Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  fromEdgeList,
  fromEdgeListStream,
  ParseError,
  toEdgeList,
  toEdgeListLines,
} from './index.js';

/** Cuts `text` into pieces of the given sizes (the last piece takes the rest). */
const chop = (text: string, sizes: readonly number[]): string[] => {
  const pieces: string[] = [];
  let start = 0;

  for (const size of sizes) {
    pieces.push(text.slice(start, start + size));
    start += size;
  }

  return [...pieces, text.slice(start)];
};

async function* asAsync(chunks: readonly string[]): AsyncGenerator<string> {
  await Promise.resolve();
  yield* chunks;
}

const summary = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges(),
});

describe('toEdgeListLines', () => {
  it('yields exactly the lines of toEdgeList, lazily', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 15 }), fc.integer(), (count, seed) => {
        const graph = randomGraph(count, { probability: 0.3, seed });

        expect([...toEdgeListLines(graph)].join('\n')).toBe(toEdgeList(graph));
      }),
    );

    const lines = toEdgeListLines(randomGraph(6, { probability: 1, seed: 1 }));

    expect(lines.next().done).toBe(false);
  });

  it('lists each directed edge once', () => {
    const graph = fromEdgeList('a b 2\nb a 3', { isDirected: true });

    expect([...toEdgeListLines(graph)]).toEqual(['a,b,2', 'b,a,3']);
  });
});

describe('fromEdgeListStream', () => {
  it('matches fromEdgeList whatever the chunk boundaries', async () => {
    const text = 'a b 2.5\r\n# note\n\nb,c\nc a 10 # trailing comment\nd d';
    const sizes = fc.array(fc.integer({ min: 0, max: 9 }), { maxLength: 12 });

    const expected = summary(fromEdgeList(text));

    await fc.assert(
      fc.asyncProperty(sizes, async (cuts) => {
        const chunks = chop(text, cuts);

        expect(summary(await fromEdgeListStream(chunks))).toEqual(expected);
        expect(summary(await fromEdgeListStream(asAsync(chunks)))).toEqual(expected);
      }),
    );
  });

  it('honors the directed option and handles empty input', async () => {
    const directed = await fromEdgeListStream(['a b\n', 'b a'], { isDirected: true });

    expect(directed.directed).toBe(true);
    expect(directed.edgeCount).toBe(2);
    const empty = await fromEdgeListStream([]);
    const blank = await fromEdgeListStream(['']);

    expect([empty.vertexCount, blank.vertexCount]).toEqual([0, 0]);
  });

  it('reports malformed lines wherever they fall', async () => {
    await expect(fromEdgeListStream(['a b\nc', ' d e f\n'])).rejects.toThrow(ParseError);
    await expect(fromEdgeListStream(asAsync(['a b x\n']))).rejects.toThrow('Invalid edge line');
    await expect(fromEdgeListStream(['lonely'])).rejects.toThrow(ParseError);
  });
});
