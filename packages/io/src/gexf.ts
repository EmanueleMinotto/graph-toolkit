import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { escapeXml, findElements, requireAttribute } from './internal/xml.js';

const nodeLines = (graph: Graph): readonly string[] =>
  graph.vertices().map((id) => `      <node id="${escapeXml(id)}" label="${escapeXml(id)}"/>`);

const edgeLines = (graph: Graph): readonly string[] =>
  graph
    .edges()
    .map(
      (edge, index) =>
        `      <edge id="${index}" source="${escapeXml(edge.source)}" ` +
        `target="${escapeXml(edge.target)}" weight="${edge.weight}"/>`,
    );

/** GEXF 1.3 with edge `weight` attributes. */
export function toGexf(graph: Graph): string {
  const type = graph.directed ? 'directed' : 'undirected';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://gexf.net/1.3" version="1.3">',
    `  <graph defaultedgetype="${type}">`,
    '    <nodes>',
    ...nodeLines(graph),
    '    </nodes>',
    '    <edges>',
    ...edgeLines(graph),
    '    </edges>',
    '  </graph>',
    '</gexf>',
    '',
  ].join('\n');
}

export function fromGexf(text: string): Graph {
  const [graph] = findElements(text, 'graph');

  if (graph === undefined) {
    throw new ParseError('Missing <graph> element');
  }

  const edges = findElements(text, 'edge').map((edge): ParsedEdge => ({
    source: requireAttribute(edge, 'source', 'edge'),
    target: requireAttribute(edge, 'target', 'edge'),
    weight: Number(edge.attributes.get('weight') ?? 1),
  }));
  const vertices = findElements(text, 'node').map((node) => requireAttribute(node, 'id', 'node'));
  const directed = graph.attributes.get('defaultedgetype') === 'directed';

  return assembleGraph({ directed, vertices, edges });
}
