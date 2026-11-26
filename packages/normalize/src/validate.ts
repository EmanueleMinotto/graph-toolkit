import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { DisjointSet } from '@graph-sdk/math';

export interface WeightRule {
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  /** Safe integers only (|w| ≤ 2^53 − 1). */
  readonly isInteger?: boolean | undefined;
}

/** Constraints a graph must satisfy; every field is optional and unset means "no constraint". */
export interface GraphSchema {
  readonly directed?: boolean | undefined;
  /** Default true. */
  readonly allowSelfLoops?: boolean | undefined;
  /** Vertices without any incident edge; default true. */
  readonly allowIsolated?: boolean | undefined;
  /** Weak connectivity (edge direction ignored). */
  readonly connected?: boolean | undefined;
  readonly maxVertices?: number | undefined;
  readonly maxEdges?: number | undefined;
  readonly vertexIdPattern?: RegExp | undefined;
  readonly weight?: WeightRule | undefined;
}

export type IssueCode =
  | 'direction'
  | 'self-loop'
  | 'isolated-vertex'
  | 'disconnected'
  | 'too-many-vertices'
  | 'too-many-edges'
  | 'vertex-id'
  | 'weight';

export interface ValidationIssue {
  readonly code: IssueCode;
  readonly message: string;
  readonly vertices: readonly VertexId[];
}

type Rule = (graph: Graph, schema: GraphSchema) => readonly ValidationIssue[];

const issue = (
  code: IssueCode,
  message: string,
  vertices: readonly VertexId[] = [],
): readonly ValidationIssue[] => [{ code, message, vertices }];

const direction: Rule = (graph, { directed }) => {
  if (directed === undefined || directed === graph.directed) {
    return [];
  }
  const expected = directed ? 'directed' : 'undirected';
  return issue('direction', `Expected a ${expected} graph`);
};

const selfLoops: Rule = (graph, { allowSelfLoops = true }) => {
  const loops = graph.edges().filter((edge) => edge.source === edge.target);
  return allowSelfLoops || loops.length === 0
    ? []
    : issue(
        'self-loop',
        `${loops.length} self-loop(s)`,
        loops.map((edge) => edge.source),
      );
};

const isolated: Rule = (graph, { allowIsolated = true }) => {
  const touched = new Set(graph.edges().flatMap((edge) => [edge.source, edge.target]));
  const lonely = graph.vertices().filter((id) => !touched.has(id));
  return allowIsolated || lonely.length === 0
    ? []
    : issue('isolated-vertex', `${lonely.length} isolated vertex(es)`, lonely);
};

const connected: Rule = (graph, { connected: isRequired }) => {
  if (isRequired !== true || graph.vertexCount < 2) {
    return [];
  }
  const sets = new DisjointSet(graph.vertexCount);
  for (const edge of graph.edges()) {
    sets.union(graph.indexOf(edge.source), graph.indexOf(edge.target));
  }
  return sets.setCount() === 1 ? [] : issue('disconnected', `${sets.setCount()} components`);
};

const sizes: Rule = (graph, { maxVertices, maxEdges }) => [
  ...(maxVertices !== undefined && graph.vertexCount > maxVertices
    ? issue('too-many-vertices', `${graph.vertexCount} vertices exceed ${maxVertices}`)
    : []),
  ...(maxEdges !== undefined && graph.edgeCount > maxEdges
    ? issue('too-many-edges', `${graph.edgeCount} edges exceed ${maxEdges}`)
    : []),
];

const vertexIds: Rule = (graph, { vertexIdPattern }) => {
  const bad = graph.vertices().filter((id) => vertexIdPattern?.test(id) === false);
  return bad.length === 0
    ? []
    : issue('vertex-id', `${bad.length} id(s) do not match the pattern`, bad);
};

function violatesWeight(weight: number, rule: WeightRule): boolean {
  const isTooLow = rule.min !== undefined && weight < rule.min;
  const isTooHigh = rule.max !== undefined && weight > rule.max;
  return isTooLow || isTooHigh || (rule.isInteger === true && !Number.isSafeInteger(weight));
}

const weights: Rule = (graph, { weight: rule }) => {
  const bad =
    rule === undefined ? [] : graph.edges().filter((edge) => violatesWeight(edge.weight, rule));
  return bad.length === 0
    ? []
    : issue(
        'weight',
        `${bad.length} edge weight(s) out of range`,
        bad.map((edge) => edge.source),
      );
};

const RULES: readonly Rule[] = [
  direction,
  selfLoops,
  isolated,
  connected,
  sizes,
  vertexIds,
  weights,
];

/** All violations of `schema` (empty array when valid). Vertex patterns must not use the `g`/`y` flags. */
export function validateGraph(graph: Graph, schema: GraphSchema): readonly ValidationIssue[] {
  return RULES.flatMap((rule) => rule(graph, schema));
}

/** Raised by {@link assertValidGraph}; carries every issue found. */
export class ValidationError extends GraphError {
  public readonly issues: readonly ValidationIssue[];

  public constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((found) => found.message).join('; '));
    this.issues = issues;
  }
}

export function assertValidGraph(graph: Graph, schema: GraphSchema): void {
  const issues = validateGraph(graph, schema);
  if (issues.length > 0) {
    throw new ValidationError(issues);
  }
}
