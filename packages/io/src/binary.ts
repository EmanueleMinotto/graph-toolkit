import type { Graph } from '@graph-sdk/core';
import { decodeGraph, encodeGraph } from './internal/binary-format.js';

/**
 * Compact binary encoding: a 4-byte signature, a flag byte, varint counts, UTF-8 vertex names and
 * one `source, target, weight` record per edge (a weight of 1 costs a single byte). Vertex order
 * and edge order are kept; attributes are not stored.
 */
export function toBinary(graph: Graph): Uint8Array {
  return encodeGraph(graph);
}

/** Reads {@link toBinary} output. Throws `ParseError` on anything truncated, malformed or trailing. */
export function fromBinary(bytes: Uint8Array): Graph {
  return decodeGraph(bytes);
}
