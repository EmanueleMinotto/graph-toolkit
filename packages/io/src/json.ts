import { type Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';

interface JsonEdge {
  readonly source: string;
  readonly target: string;
  readonly weight?: number;
}

interface JsonGraph {
  readonly directed: boolean;
  readonly vertices: readonly string[];
  readonly edges: readonly JsonEdge[];
}

/** `{ directed, vertices, edges: [{ source, target, weight }] }` */
export function toJson(graph: Graph): string {
  const document: JsonGraph = {
    directed: graph.directed,
    vertices: graph.vertices(),
    edges: graph.edges(),
  };
  return JSON.stringify(document);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === 'number';

const isEdge = (value: unknown): value is JsonEdge =>
  isRecord(value) &&
  typeof value['source'] === 'string' &&
  typeof value['target'] === 'string' &&
  isOptionalNumber(value['weight']);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isEdgeArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((edge) => isEdge(edge));

const isGraphDocument = (value: unknown): value is JsonGraph =>
  isRecord(value) &&
  typeof value['directed'] === 'boolean' &&
  isStringArray(value['vertices']) &&
  isEdgeArray(value['edges']);

function parseDocument(text: string): JsonGraph {
  const value: unknown = JSON.parse(text);
  if (!isGraphDocument(value)) throw new ParseError('Invalid graph JSON document');
  return value;
}

export function fromJson(text: string): Graph {
  const document = parseDocument(text);
  const edges = document.edges.map((edge): ParsedEdge => ({ ...edge, weight: edge.weight ?? 1 }));
  return assembleGraph({ ...document, edges });
}
