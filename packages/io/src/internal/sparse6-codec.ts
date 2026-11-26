import { GraphError } from '@graph-sdk/core';
import { ParseError } from '../errors.js';
import { BITS, decodeOrder, encodeOrder, OFFSET } from './graph6-codec.js';

type Edge = readonly [number, number];

/** Bits needed to write a vertex number (at least 1). */
const widthFor = (count: number): number => Math.max(1, Math.ceil(Math.log2(count)));

const toBits = (value: number, width: number): number[] =>
  Array.from({ length: width }, (_, bit) => (value >> (width - 1 - bit)) & 1);

/** Edges (x < y) ordered by y, then x, as the format requires. */
const ordered = (edges: readonly Edge[]): Edge[] =>
  edges
    .map(([a, b]): Edge => [Math.min(a, b), Math.max(a, b)])
    .toSorted((l, r) => l[1] - r[1] || l[0] - r[0]);

function edgeBits(edges: readonly Edge[], width: number): number[] {
  const bits: number[] = [];
  let current = 0;
  for (const [low, high] of edges) {
    if (high > current) {
      bits.push(1, ...toBits(high === current + 1 ? low : high, width));
      if (high !== current + 1) {
        bits.push(0, ...toBits(low, width));
      }
      current = high;
    } else {
      bits.push(0, ...toBits(low, width));
    }
  }
  return bits;
}

/** sparse6 text (with the leading `:`) for `count` vertices and loop-free `edges`. */
export function encodeSparse6(count: number, edges: readonly Edge[]): string {
  if (edges.some(([a, b]) => a === b)) {
    throw new GraphError('sparse6 here does not support self-loops');
  }
  const bits = edgeBits(ordered(edges), widthFor(count));
  const padded = [
    ...bits,
    ...Array.from({ length: (BITS - (bits.length % BITS)) % BITS }, () => 1),
  ];
  const chars = Array.from({ length: padded.length / BITS }, (_, chunk) =>
    String.fromCodePoint(
      padded.slice(chunk * BITS, (chunk + 1) * BITS).reduce((sum, bit) => sum * 2 + bit, 0) +
        OFFSET,
    ),
  );
  return `:${encodeOrder(count)}${chars.join('')}`;
}

function bitsOf(body: string): number[] {
  return Array.from(body, (char) => toBits(char.codePointAt(0)! - OFFSET, BITS)).flat();
}

const readNumber = (bits: readonly number[], start: number, width: number): number =>
  bits.slice(start, start + width).reduce((sum, bit) => sum * 2 + bit, 0);

interface Reader {
  readonly count: number;
  current: number;
}

/** Applies one (b, x) pair; returns the new edge, or `undefined` for a jump; `null` at the padding. */
function step(reader: Reader, bit: number, value: number): Edge | undefined | null {
  if (bit === 1) {
    reader.current++;
  }
  if (reader.current >= reader.count || value === reader.current) {
    return null;
  }
  if (value > reader.current) {
    reader.current = value;
    return reader.current >= reader.count ? null : undefined;
  }
  return [value, reader.current];
}

/** Vertex count and edges of a sparse6 line; padding bits never form an edge. */
export function decodeSparse6(line: string): { count: number; edges: Edge[] } {
  const text = line.trim().replace(/^>>sparse6<</u, '');
  if (!text.startsWith(':')) {
    throw new ParseError('sparse6 text must start with ":"');
  }
  const [count, body] = decodeOrder(text.slice(1));
  const width = widthFor(count);
  const bits = bitsOf(body);
  const reader: Reader = { count, current: 0 };
  const edges: Edge[] = [];
  for (let at = 0; at + 1 + width <= bits.length; at += 1 + width) {
    const found = step(reader, bits[at]!, readNumber(bits, at + 1, width));
    if (found === null) {
      break;
    }
    if (found !== undefined) {
      edges.push(found);
    }
  }
  return { count, edges };
}
