import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { escapeXml, findElements, requireAttribute } from './internal/xml.js';

const nodeLines = (graph: Graph): readonly string[] =>
  graph.vertices().map((id) => `    <node id="${escapeXml(id)}"/>`);

const edgeLines = (graph: Graph): readonly string[] =>
  graph
    .edges()
    .map(
      (edge) =>
        `    <edge source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">` +
        `<data key="d0">${edge.weight}</data></edge>`,
    );

/** GraphML with a `weight` key (`d0`) on edges. */
export function toGraphMl(graph: Graph): string {
  const edgeDefault = graph.directed ? 'directed' : 'undirected';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="d0" for="edge" attr.name="weight" attr.type="double"/>',
    `  <graph id="G" edgedefault="${edgeDefault}">`,
    ...nodeLines(graph),
    ...edgeLines(graph),
    '  </graph>',
    '</graphml>',
    '',
  ].join('\n');
}

function weightOf(body: string): number {
  const text = /<data\b[^>]*>([^<]*)<\/data>/u.exec(body)?.[1];
  return text === undefined ? 1 : Number(text);
}

export function fromGraphMl(text: string): Graph {
  const [graph] = findElements(text, 'graph');
  if (graph === undefined) throw new ParseError('Missing <graph> element');
  const edges = findElements(text, 'edge').map((edge): ParsedEdge => ({
    source: requireAttribute(edge, 'source', 'edge'),
    target: requireAttribute(edge, 'target', 'edge'),
    weight: weightOf(edge.body),
  }));
  const vertices = findElements(text, 'node').map((node) => requireAttribute(node, 'id', 'node'));
  const directed = graph.attributes.get('edgedefault') === 'directed';
  return assembleGraph({ directed, vertices, edges });
}
