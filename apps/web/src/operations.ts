import {
  canonicalize,
  cartesianProduct,
  complement,
  contractEdge,
  inducedSubgraph,
  intersection,
  lineGraph,
  reindex,
  relabel,
  removeSelfLoops,
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
  | 'contract'
  | 'canonicalize'
  | 'reindex'
  | 'relabel'
  | 'remove-loops';

export interface Operation {
  readonly id: OperationKind;
  readonly label: string;
  readonly group: 'Two graphs' | 'One graph' | 'Normalize';
  /** Label of the free-text input this operation reads, if any. */
  readonly field?: string;
}

const TWO_GRAPHS = 'Two graphs';

export const OPERATIONS: readonly Operation[] = [
  { id: 'union', label: 'Union', group: TWO_GRAPHS },
  { id: 'intersection', label: 'Intersection', group: TWO_GRAPHS },
  { id: 'cartesian', label: 'Cartesian product', group: TWO_GRAPHS },
  { id: 'tensor', label: 'Tensor product', group: TWO_GRAPHS },
  { id: 'complement', label: 'Complement', group: 'One graph' },
  { id: 'transpose', label: 'Transpose (reverse arcs)', group: 'One graph' },
  { id: 'line-graph', label: 'Line graph', group: 'One graph' },
  { id: 'subgraph', label: 'Induced subgraph', group: 'One graph', field: 'Keep vertices' },
  { id: 'contract', label: 'Contract edge (selected pair)', group: 'One graph' },
  { id: 'canonicalize', label: 'Canonicalize (sorted ids and edges)', group: 'Normalize' },
  { id: 'reindex', label: 'Reindex ids to 0..n-1', group: 'Normalize' },
  { id: 'relabel', label: 'Relabel with a prefix', group: 'Normalize', field: 'Prefix' },
  { id: 'remove-loops', label: 'Remove self-loops', group: 'Normalize' },
];

/** Everything an operation may read besides the graphs. */
export interface OperationInput {
  readonly other: Graph;
  readonly picked: readonly VertexId[];
  /** Free text for operations with a `field`: vertex ids to keep, or an id prefix. */
  readonly text: string;
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
  if (size > MAX_RESULT) {
    throw new Error(`Result too large (${size} > ${MAX_RESULT})`);
  }

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

  if (keep.length === 0) {
    throw new Error('Enter the vertices to keep, separated by commas');
  }

  return inducedSubgraph(graph, keep);
}

function contraction(graph: Graph, [keep, merge]: readonly VertexId[]): Graph {
  if (keep === undefined || merge === undefined) {
    throw new Error('Pick the two ends of the edge');
  }

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
  subgraph: (graph, { text }) => subgraph(graph, text),
  contract: (graph, { picked }) => contraction(graph, picked),
  canonicalize: (graph) => canonicalize(graph),
  reindex: (graph) => reindex(graph),
  relabel: (graph, { text }) => relabel(graph, (id) => vertexId(`${text}${id}`)),
  'remove-loops': (graph) => removeSelfLoops(graph),
};

/** Applies `kind`; library and guard errors propagate as `Error`s for the UI to show. */
export const applyOperation = (kind: OperationKind, graph: Graph, input: OperationInput): Graph =>
  runs[kind](graph, input);
