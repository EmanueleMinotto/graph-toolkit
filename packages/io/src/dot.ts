import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import {
  chainEdges,
  idsOf,
  maskStrings,
  nameOf,
  splitAttributes,
  unmask,
  weightOf,
} from './internal/dot-tokens.js';

const quote = (name: string): string => `"${name.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

/** Graphviz DOT; edge weights are written as `weight` attributes. */
export function toDot(graph: Graph): string {
  const operator = graph.directed ? '->' : '--';
  const nodes = graph.vertices().map((vertex) => `  ${quote(vertex)};`);
  const edges = graph
    .edges()
    .map(
      (edge) =>
        `  ${quote(edge.source)} ${operator} ${quote(edge.target)} [weight=${edge.weight}];`,
    );

  return `${graph.directed ? 'digraph' : 'graph'} {\n${[...nodes, ...edges].join('\n')}\n}\n`;
}

function splitHeader(text: string): { readonly directed: boolean; readonly body: string } {
  const open = text.indexOf('{');
  const close = text.lastIndexOf('}');
  const words = text.slice(0, open).trim().split(/\s+/u);
  const kind = words.find((word) => word === 'graph' || word === 'digraph');

  if (kind === undefined || open === -1 || close < open) {
    throw new ParseError('Invalid DOT header');
  }

  return { directed: kind === 'digraph', body: text.slice(open + 1, close) };
}

function parseStatement(
  statement: string,
  operator: string,
  strings: readonly string[],
): readonly ParsedEdge[] {
  const [head, attributes] = splitAttributes(statement);
  const isEdge = !head.includes('=') && head.includes(operator);

  return isEdge ? chainEdges(idsOf(head), weightOf(unmask(attributes, strings))) : [];
}

function parseNodes(statements: readonly string[], operator: string): readonly string[] {
  return statements
    .filter((statement) => !statement.includes('=') && !statement.includes(operator))
    .flatMap((statement) => idsOf(splitAttributes(statement)[0]));
}

const statementsOf = (body: string): readonly string[] =>
  body
    .split(/[;\n]/u)
    .map((part) => part.trim())
    .filter(Boolean);

/** Parses simple DOT (nodes, edges, `weight` attribute). Subgraphs are not supported. */
export function fromDot(text: string): Graph {
  const { text: masked, strings } = maskStrings(text);
  const { directed, body } = splitHeader(masked);

  if (/\bsubgraph\b|\{/u.test(body)) {
    throw new ParseError('DOT subgraphs are not supported');
  }

  const operator = directed ? '->' : '--';
  const statements = statementsOf(body);
  const name = (id: string): string => nameOf(id, strings);

  return assembleGraph({
    directed,
    vertices: parseNodes(statements, operator).map((id) => name(id)),
    edges: statements
      .flatMap((statement) => parseStatement(statement, operator, strings))
      .map((edge) => ({ ...edge, source: name(edge.source), target: name(edge.target) })),
  });
}
