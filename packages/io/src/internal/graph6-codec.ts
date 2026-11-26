import { GraphError } from '@graph-sdk/core';
import { ParseError } from '../errors.js';

export const OFFSET = 63;
export const BITS = 6;
const SMALL_LIMIT = 62;
const LARGE_LIMIT = 258_047;
const LARGE_MARK = 126;
const LARGE_DIGITS = 3;
const DIGIT_MASK = 63;

export function encodeOrder(count: number): string {
  if (count <= SMALL_LIMIT) {
    return String.fromCodePoint(count + OFFSET);
  }
  const digits = [count >> 12, (count >> 6) & DIGIT_MASK, count & DIGIT_MASK];
  return String.fromCodePoint(LARGE_MARK, ...digits.map((digit) => digit + OFFSET));
}

const packBits = (bits: readonly number[]): string =>
  Array.from({ length: Math.ceil(bits.length / BITS) }, (_, chunk) => {
    const group = bits.slice(chunk * BITS, (chunk + 1) * BITS);
    const padded = [...group, ...Array.from({ length: BITS - group.length }, () => 0)];
    return String.fromCodePoint(padded.reduce((sum, bit) => sum * 2 + bit, 0) + OFFSET);
  }).join('');

/** graph6 text for `count` vertices; `isLinked(from, to)` is queried for every from < to. */
export function encodeGraph6(
  count: number,
  isLinked: (from: number, to: number) => boolean,
): string {
  if (count > LARGE_LIMIT) {
    throw new GraphError('graph6 supports at most 258047 vertices');
  }
  const bits: number[] = [];
  for (let to = 1; to < count; to++) {
    for (let from = 0; from < to; from++) {
      bits.push(isLinked(from, to) ? 1 : 0);
    }
  }
  return encodeOrder(count) + packBits(bits);
}

/** Header digits (6 bits each) and how many characters they span. */
function headerDigits(text: string): readonly number[] {
  const isLarge = text.codePointAt(0) === LARGE_MARK;
  const head = isLarge ? text.slice(1, 1 + LARGE_DIGITS) : text.slice(0, 1);
  const values = Array.from(head, (char) => char.codePointAt(0)! - OFFSET);
  const isValid = head.length === (isLarge ? LARGE_DIGITS : 1);
  if (!isValid || values.some((value) => value < 0 || value > DIGIT_MASK)) {
    throw new ParseError('Invalid graph6 header');
  }
  return values;
}

export function decodeOrder(text: string): readonly [count: number, rest: string] {
  const values = headerDigits(text);
  const consumed = values.length === 1 ? 1 : 1 + LARGE_DIGITS;
  return [values.reduce((sum, value) => (sum << BITS) | value, 0), text.slice(consumed)];
}

/** Vertex count and edges (index pairs) encoded in one graph6 line. */
export function decodeGraph6(line: string): { count: number; edges: [number, number][] } {
  const [count, body] = decodeOrder(line.trim().replace(/^>>graph6<</u, ''));
  if (body.length !== Math.ceil((count * (count - 1)) / 2 / BITS)) {
    throw new ParseError('graph6 body has the wrong length');
  }
  const edges: [number, number][] = [];
  let position = 0;
  for (let to = 1; to < count; to++) {
    for (let from = 0; from < to; from++, position++) {
      const value = body.codePointAt(Math.floor(position / BITS))! - OFFSET;
      if ((value >> (BITS - 1 - (position % BITS))) & 1) {
        edges.push([from, to]);
      }
    }
  }
  return { count, edges };
}
