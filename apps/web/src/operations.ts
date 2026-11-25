import {
  cartesianProduct,
  complement,
  contractEdge,
  inducedSubgraph,
  intersection,
  lineGraph,
  tensorProduct,
  transpose,
  union,
  vertexId,
  type Graph,
  type VertexId,
} from 'graph-toolkit';

export type OperationKind =
  | 'union'
  | 'intersection'
  | 'cartesian'
  | 'tensor'
  | 'complement'
  | 'transpose'
  | 'line-graph'
  | 'subgraph'
  | 'contract';

export interface Operation {
  readonly id: OperationKind;
  readonly label: string;
  readonly group: 'Two graphs' | 'One graph';
}

export const OPERATIONS: readonly Operation[] = [
  { id: 'union', label: 'Union', group: 'Two graphs' },
  { id: 'intersection', label: 'Intersection', group: 'Two graphs' },
  { id: 'cartesian', label: 'Cartesian product', group: 'Two graphs' },
  { id: 'tensor', label: 'Tensor product', group: 'Two graphs' },
  { id: 'complement', label: 'Complement', group: 'One graph' },
  { id: 'transpose', label: 'Transpose (reverse arcs)', group: 'One graph' },
  { id: 'line-graph', label: 'Line graph', group: 'One graph' },
  { id: 'subgraph', label: 'Induced subgraph', group: 'One graph' },
  { id: 'contract', label: 'Contract edge (selected pair)', group: 'One graph' },
];

/** Everything an operation may read besides the graphs. */
export interface OperationInput {
  readonly other: Graph;
  readonly picked: readonly VertexId[];
  /** Comma-separated vertex ids for the induced subgraph. */
  readonly keep: string;
}

const MAX_RESULT = 5000;

/** Edges of the line graph: every pair of edges meeting at a vertex. */
const adjacentEdgePairs = (graph: Graph): number =>
  graph
    .vertices()
    .values()
    .map((id) => (graph.degree(id) * (graph.degree(id) - 1)) / 2)
    .reduce((total, pairs) => total + pairs, 0);

/** Refuses results that would freeze the page: `size` is the vertex or edge count they produce. */
function limited(size: number, graph: () => Graph): Graph {
  if (size > MAX_RESULT) throw new Error(`Result too large (${size} > ${MAX_RESULT})`);
  return graph();
}

const keptIds = (text: string): readonly VertexId[] =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => vertexId(part));

function subgraph(graph: Graph, text: string): Graph {
  const keep = keptIds(text);
  if (keep.length === 0) throw new Error('Enter the vertices to keep, separated by commas');
  return inducedSubgraph(graph, keep);
}

function contraction(graph: Graph, [keep, merge]: readonly VertexId[]): Graph {
  if (keep === undefined || merge === undefined) throw new Error('Pick the two ends of the edge');
  return contractEdge(graph, keep, merge);
}

type Run = (graph: Graph, input: OperationInput) => Graph;

const runs: Readonly<Record<OperationKind, Run>> = {
  union: (graph, { other }) => union(graph, other),
  intersection: (graph, { other }) => intersection(graph, other),
  cartesian: (graph, { other }) =>
    limited(graph.vertexCount * other.vertexCount, () => cartesianProduct(graph, other)),
  tensor: (graph, { other }) =>
    limited(graph.vertexCount * other.vertexCount, () => tensorProduct(graph, other)),
  complement: (graph) => limited(graph.vertexCount ** 2, () => complement(graph)),
  transpose: (graph) => transpose(graph),
  'line-graph': (graph) =>
    limited(Math.max(graph.edgeCount, adjacentEdgePairs(graph)), () => lineGraph(graph)),
  subgraph: (graph, { keep }) => subgraph(graph, keep),
  contract: (graph, { picked }) => contraction(graph, picked),
};

/** Applies `kind`; library and guard errors propagate as `Error`s for the UI to show. */
export const applyOperation = (kind: OperationKind, graph: Graph, input: OperationInput): Graph =>
  runs[kind](graph, input);
