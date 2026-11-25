import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { chainEdges, idsOf, splitAttributes, weightOf } from './internal/dot-tokens.js';

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

const stripComments = (text: string): string =>
  text.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/(?:\/\/|#).*/g, '');

function splitHeader(text: string): { readonly directed: boolean; readonly body: string } {
  const open = text.indexOf('{');
  const close = text.lastIndexOf('}');
  const words = text.slice(0, open).trim().split(/\s+/);
  const kind = words.find((word) => word === 'graph' || word === 'digraph');
  if (kind === undefined || open === -1 || close < open) throw new ParseError('Invalid DOT header');
  return { directed: kind === 'digraph', body: text.slice(open + 1, close) };
}

function parseStatement(statement: string, operator: string): readonly ParsedEdge[] {
  const [head, attributes] = splitAttributes(statement);
  const isEdge = !head.includes('=') && head.includes(operator);
  return isEdge ? chainEdges(idsOf(head), weightOf(attributes)) : [];
}

function parseNodes(statements: readonly string[], operator: string): readonly string[] {
  return statements
    .filter((statement) => !statement.includes('=') && !statement.includes(operator))
    .flatMap((statement) => idsOf(splitAttributes(statement)[0]));
}

/** Parses simple DOT (nodes, edges, `weight` attribute). Subgraphs are not supported. */
export function fromDot(text: string): Graph {
  const { directed, body } = splitHeader(stripComments(text));
  if (/\bsubgraph\b|\{/.test(body)) throw new ParseError('DOT subgraphs are not supported');
  const operator = directed ? '->' : '--';
  const statements = body
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const edges = statements.flatMap((statement) => parseStatement(statement, operator));
  return assembleGraph({ directed, vertices: parseNodes(statements, operator), edges });
}
