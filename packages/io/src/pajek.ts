import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { splitSections } from './internal/pajek-sections.js';

const EDGE_FIELDS = 3;

const quote = (name: string): string => `"${name.replaceAll('"', "'")}"`;

/** Pajek `.net`: `*Vertices`, then `*Edges` (undirected) or `*Arcs` (directed). `"` in names becomes `'`. */
export function toPajek(graph: Graph): string {
  const index = (id: string): number => graph.indexOf(id as never) + 1;
  const vertices = graph.vertices().map((id) => `${index(id)} ${quote(id)}`);
  const edges = graph
    .edges()
    .map((edge) => `${index(edge.source)} ${index(edge.target)} ${edge.weight}`);
  const section = graph.directed ? '*Arcs' : '*Edges';
  return [`*Vertices ${graph.vertexCount}`, ...vertices, section, ...edges].join('\n') + '\n';
}

const VERTEX = /^(\d+)\s*(?:"([^"]*)"|(\S+))?/u;

function parseVertex(line: string): readonly [number, string] {
  const match = VERTEX.exec(line);
  if (match === null) throw new ParseError(`Invalid Pajek vertex line: ${line}`);
  const id = Number(match[1]);
  return [id, match[2] ?? match[3] ?? String(id)];
}

function parseEdge(names: ReadonlyMap<number, string>, line: string): ParsedEdge {
  const [from, to, weight] = line.split(/\s+/u, EDGE_FIELDS);
  const source = names.get(Number(from));
  const target = names.get(Number(to));
  if (source === undefined || target === undefined) {
    throw new ParseError(`Pajek edge with unknown vertex: ${line}`);
  }
  const parsed = weight === undefined ? 1 : Number(weight);
  if (!Number.isFinite(parsed)) throw new ParseError(`Invalid Pajek weight: ${line}`);
  return { source, target, weight: parsed };
}

/** Reads `*Vertices`, `*Edges` and `*Arcs` sections; `%` starts a comment, other sections are ignored. */
export function fromPajek(text: string): Graph {
  const { directed, vertices, rows } = splitSections(text);
  if (vertices.length === 0 && rows.length === 0)
    throw new ParseError('Pajek document has no vertices');
  const names = new Map(vertices.map((line) => parseVertex(line)));
  return assembleGraph({
    directed,
    vertices: [...names.values()],
    edges: rows.map((row) => parseEdge(names, row)),
  });
}
