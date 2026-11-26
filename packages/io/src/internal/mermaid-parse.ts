import { ParseError } from '../errors.js';
import type { ParsedGraph } from './assemble.js';
import { parseEdge, parseNode, type EdgeToken, type NodeToken } from './mermaid-tokens.js';

const HEADER = /^(?:flowchart|graph)\b/u;

function bodyLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/%%.*/u, '').trim().replace(/;$/u, ''))
    .filter(Boolean);
  const [header = '', ...body] = lines;
  if (!HEADER.test(header)) {
    throw new ParseError('Mermaid text must start with flowchart/graph');
  }
  return body;
}

/** Edge and node tokens of every body line. */
function tokenize(text: string): { edges: EdgeToken[]; nodes: NodeToken[] } {
  const edges: EdgeToken[] = [];
  const nodes: NodeToken[] = [];
  for (const line of bodyLines(text)) {
    const edge = parseEdge(line);
    if (edge === undefined) {
      nodes.push(parseNode(line));
    } else {
      edges.push(edge);
    }
  }
  return { edges, nodes };
}

export function parseMermaid(text: string): ParsedGraph {
  const { edges, nodes } = tokenize(text);
  const endpoints = edges.flatMap((edge) => [edge.left, edge.right]);
  const labels = new Map<string, string>();
  for (const node of [...endpoints, ...nodes]) {
    if (node.label !== undefined) {
      labels.set(node.key, node.label);
    }
  }
  const name = (key: string): string => labels.get(key) ?? key;
  const keys = new Set([...endpoints, ...nodes].map((node) => node.key));
  return {
    directed: edges.some((edge) => edge.isDirected),
    vertices: [...keys].map((key) => name(key)),
    edges: edges.map((edge) => ({
      source: name(edge.left.key),
      target: name(edge.right.key),
      weight: edge.weight,
    })),
  };
}
