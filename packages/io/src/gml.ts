import type { Graph } from '@graph-toolkit/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { listsOf, parseGml, valueOf, type GmlList } from './internal/gml-parse.js';

const escape = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

/** Graph Modelling Language: numeric node ids, `label` carries the vertex name. */
export function toGml(graph: Graph): string {
  const nodes = graph.vertices().map((id, index) => `  node [ id ${index} label "${escape(id)}" ]`);
  const edges = graph
    .edges()
    .map(
      (edge) =>
        `  edge [ source ${graph.indexOf(edge.source)} target ${graph.indexOf(edge.target)} weight ${edge.weight} ]`,
    );
  const header = ['graph [', `  directed ${graph.directed ? 1 : 0}`];
  return [...header, ...nodes, ...edges, ']'].join('\n') + '\n';
}

function nameOf(node: GmlList): readonly [number, string] {
  const id = valueOf(node, 'id');
  if (typeof id !== 'number') throw new ParseError('GML node without numeric id');
  const label = valueOf(node, 'label');
  return [id, typeof label === 'string' ? label : String(id)];
}

function edgeOf(names: ReadonlyMap<number, string>, edge: GmlList): ParsedEdge {
  const [source, target] = [valueOf(edge, 'source'), valueOf(edge, 'target')];
  const from = typeof source === 'number' ? names.get(source) : undefined;
  const to = typeof target === 'number' ? names.get(target) : undefined;
  if (from === undefined || to === undefined) throw new ParseError('GML edge with unknown node');
  const weight = valueOf(edge, 'weight');
  return { source: from, target: to, weight: typeof weight === 'number' ? weight : 1 };
}

/** Parses GML written by {@link toGml} or other tools (extra attributes are ignored). */
export function fromGml(text: string): Graph {
  const [body] = listsOf(parseGml(text), 'graph');
  if (body === undefined) throw new ParseError('GML document has no graph');
  const names = new Map(listsOf(body, 'node').map((node) => nameOf(node)));
  return assembleGraph({
    directed: valueOf(body, 'directed') === 1,
    vertices: [...names.values()],
    edges: listsOf(body, 'edge').map((edge) => edgeOf(names, edge)),
  });
}
