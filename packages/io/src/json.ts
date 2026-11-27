import { type Attributes, type Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';

interface JsonEdge {
  readonly source: string;
  readonly target: string;
  readonly weight?: number;
  readonly attributes?: Attributes;
}

interface JsonGraph {
  readonly directed: boolean;
  readonly vertices: readonly string[];
  readonly edges: readonly JsonEdge[];
  readonly vertexAttributes?: Readonly<Record<string, Attributes>>;
}

const hasKeys = (value: object): boolean => Object.keys(value).length > 0;

function vertexAttributesOf(graph: Graph): Readonly<Record<string, Attributes>> {
  const entries = graph.vertices().map((id) => [id, graph.vertexAttributes(id)] as const);

  return Object.fromEntries(entries.filter(([, attributes]) => hasKeys(attributes)));
}

/**
 * `{ directed, vertices, edges: [{ source, target, weight, attributes? }], vertexAttributes? }`;
 * attributes appear only where the graph has them.
 */
export function toJson(graph: Graph): string {
  const vertexAttributes = vertexAttributesOf(graph);
  const document: JsonGraph = {
    directed: graph.directed,
    vertices: graph.vertices(),
    edges: graph.edges(),
    ...(hasKeys(vertexAttributes) && { vertexAttributes }),
  };

  return JSON.stringify(document);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === 'number';

const isAttributeValue = (value: unknown): boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);

const isAttributes = (value: unknown): value is Attributes =>
  isRecord(value) && Object.values(value).every((item) => isAttributeValue(item));

const isOptionalAttributes = (value: unknown): boolean =>
  value === undefined || isAttributes(value);

const isVertexAttributes = (value: unknown): boolean =>
  value === undefined ||
  (isRecord(value) && Object.values(value).every((item) => isAttributes(item)));

const hasEndpoints = (value: Record<string, unknown>): boolean =>
  typeof value['source'] === 'string' && typeof value['target'] === 'string';

const isEdge = (value: unknown): value is JsonEdge =>
  isRecord(value) &&
  hasEndpoints(value) &&
  isOptionalNumber(value['weight']) &&
  isOptionalAttributes(value['attributes']);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isEdgeArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((edge) => isEdge(edge));

const hasStructure = (value: Record<string, unknown>): boolean =>
  typeof value['directed'] === 'boolean' &&
  isStringArray(value['vertices']) &&
  isEdgeArray(value['edges']);

const isGraphDocument = (value: unknown): value is JsonGraph =>
  isRecord(value) && hasStructure(value) && isVertexAttributes(value['vertexAttributes']);

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ParseError('Invalid JSON');
  }
}

function parseDocument(text: string): JsonGraph {
  const value = parseJson(text);

  if (!isGraphDocument(value)) {
    throw new ParseError('Invalid graph JSON document');
  }

  return value;
}

export function fromJson(text: string): Graph {
  const document = parseDocument(text);
  const edges = document.edges.map((edge): ParsedEdge => ({ ...edge, weight: edge.weight ?? 1 }));

  return assembleGraph({ ...document, edges });
}
