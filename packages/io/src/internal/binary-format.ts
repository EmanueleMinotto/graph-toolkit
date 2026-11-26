import type { Graph } from '@graph-sdk/core';
import { ParseError } from '../errors.js';
import { assembleGraph, type ParsedEdge } from './assemble.js';
import {
  createReader,
  createWriter,
  finish,
  readBytes,
  readByte,
  readFloat64,
  readVarint,
  remaining,
  writeByte,
  writeBytes,
  writeFloat64,
  writeVarint,
  type Reader,
  type Writer,
} from './bytes.js';

/** `TextEncoder` and `TextDecoder` exist in Node and browsers; the project's typings omit both. */
interface TextCodecs {
  readonly TextEncoder: new () => { readonly encode: (text: string) => Uint8Array };
  readonly TextDecoder: new (
    label: string,
    options: { readonly fatal: boolean },
  ) => { readonly decode: (bytes: Uint8Array) => string };
}

const { TextEncoder, TextDecoder } = globalThis as unknown as TextCodecs;

const MAGIC = [0x47, 0x54, 0x42, 0x01] as const;
const FLAG_DIRECTED = 1;
const WEIGHT_ONE = 0;
const WEIGHT_FLOAT = 1;

function writeText(writer: Writer, text: string): void {
  const encoded = new TextEncoder().encode(text);

  writeVarint(writer, encoded.length);
  writeBytes(writer, encoded);
}

function writeEdge(writer: Writer, edge: ParsedEdge, indices: ReadonlyMap<string, number>): void {
  writeVarint(writer, indices.get(edge.source)!);
  writeVarint(writer, indices.get(edge.target)!);

  if (edge.weight === 1) {
    writeByte(writer, WEIGHT_ONE);

    return;
  }

  writeByte(writer, WEIGHT_FLOAT);
  writeFloat64(writer, edge.weight);
}

export function encodeGraph(graph: Graph): Uint8Array {
  const writer = createWriter();
  const names = graph.vertices();
  const indices = new Map(names.map((name, index) => [name as string, index]));

  for (const byte of MAGIC) {
    writeByte(writer, byte);
  }

  writeByte(writer, graph.directed ? FLAG_DIRECTED : 0);
  writeVarint(writer, names.length);
  writeVarint(writer, graph.edgeCount);

  for (const name of names) {
    writeText(writer, name);
  }

  for (const edge of graph.edges()) {
    writeEdge(writer, edge, indices);
  }

  return finish(writer);
}

function readHeader(reader: Reader): boolean {
  const magic = readBytes(reader, MAGIC.length);

  if (MAGIC.some((byte, index) => magic[index] !== byte)) {
    throw new ParseError('Not a graph-toolkit binary graph (bad signature or version)');
  }

  const flags = readByte(reader);

  if (flags > FLAG_DIRECTED) {
    throw new ParseError('Unknown flags in binary graph');
  }

  return flags === FLAG_DIRECTED;
}

function readText(reader: Reader): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(readBytes(reader, readVarint(reader)));
  } catch (error) {
    throw error instanceof ParseError ? error : new ParseError('Invalid UTF-8 in binary graph');
  }
}

function readNames(reader: Reader, count: number): string[] {
  const names = Array.from({ length: count }, () => readText(reader));

  if (new Set(names).size !== count) {
    throw new ParseError('Duplicate vertex in binary graph');
  }

  return names;
}

function readEdge(reader: Reader, names: readonly string[]): ParsedEdge {
  const [source, target] = [names[readVarint(reader)], names[readVarint(reader)]];
  const tag = readByte(reader);

  if (source === undefined || target === undefined || tag > WEIGHT_FLOAT) {
    throw new ParseError('Invalid edge in binary graph');
  }

  return { source, target, weight: tag === WEIGHT_ONE ? 1 : readFloat64(reader) };
}

const MIN_EDGE_BYTES = 3;

export function decodeGraph(bytes: Uint8Array): Graph {
  const reader = createReader(bytes);
  const directed = readHeader(reader);
  const [vertexCount, edgeCount] = [readVarint(reader), readVarint(reader)];

  if (vertexCount + edgeCount * MIN_EDGE_BYTES > remaining(reader)) {
    throw new ParseError('Binary graph is shorter than its header claims');
  }

  const vertices = readNames(reader, vertexCount);
  const edges = Array.from({ length: edgeCount }, () => readEdge(reader, vertices));

  if (remaining(reader) > 0) {
    throw new ParseError('Unexpected data after binary graph');
  }

  return assembleGraph({ directed, vertices, edges });
}
