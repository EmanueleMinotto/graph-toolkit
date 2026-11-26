import { GraphError, type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { valueAt } from './internal/access.js';
import { hungarian } from './internal/assignment.js';
import { blossomMatching } from './internal/blossom.js';
import { minCostFlowKernel, type Arc, type FlowResult } from './internal/min-cost.js';
import type { Matching } from './matching.js';

/** Maximum matching of any undirected graph (Edmonds' blossom algorithm, $O(V \cdot E)$ per phase). */
export function maximumMatching(graph: Graph): Matching {
  if (graph.directed) {
    throw new GraphError('maximumMatching requires an undirected graph');
  }

  const mate = blossomMatching(graph.csr, graph.vertexCount);
  const pairs = [...mate.keys()]
    .filter((vertex) => vertex < valueAt(mate, vertex))
    .map((vertex) => [graph.vertexAt(vertex), graph.vertexAt(valueAt(mate, vertex))] as const);

  return { pairs, size: pairs.length };
}

export interface Assignment {
  /** `assignment[row]` is the column chosen for that row. */
  readonly assignment: readonly number[];
  readonly cost: number;
}

/**
 * Minimum-cost assignment of every row to a distinct column (Hungarian algorithm, $O(\text{rows}^2 \cdot \text{columns})$).
 * Needs a rectangular matrix with rows ≤ columns; costs may be negative.
 */
export function minimumCostAssignment(costs: readonly (readonly number[])[]): Assignment {
  const width = costs[0]?.length ?? 0;

  if (costs.some((row) => row.length !== width) || costs.length > width) {
    throw new GraphError('cost matrix must be rectangular with rows <= columns');
  }

  const assignment = hungarian(costs);
  const cost = costs.reduce((sum, row, index) => sum + valueAt(row, valueAt(assignment, index)), 0);

  return { assignment, cost };
}

export interface MinCostFlowOptions {
  /** Capacity of an arc; the arc weight is its per-unit cost. */
  readonly capacity: (edge: Edge) => number;
  /** Flow to send; default is as much as possible (min-cost maximum flow). */
  readonly amount?: number;
}

function arcsOf(graph: Graph, options: MinCostFlowOptions): readonly Arc[] {
  return graph.edges().map((edge): Arc => {
    const capacity = options.capacity(edge);

    if (capacity < 0) {
      throw new GraphError('capacities must be non-negative');
    }

    const [from, to] = [graph.indexOf(edge.source), graph.indexOf(edge.target)];

    return { from, to, capacity, cost: edge.weight };
  });
}

/**
 * Successive-shortest-path min-cost flow on a directed graph whose weights are per-unit costs
 * (negative costs allowed if there is no negative cycle). Returns the flow actually sent and its cost.
 */
export function minCostFlow(
  graph: Graph,
  ends: { readonly source: VertexId; readonly sink: VertexId },
  options: MinCostFlowOptions,
): FlowResult {
  if (!graph.directed) {
    throw new GraphError('minCostFlow requires a directed graph');
  }

  if (ends.source === ends.sink) {
    throw new GraphError('source and sink must differ');
  }

  return minCostFlowKernel({
    count: graph.vertexCount,
    arcs: arcsOf(graph, options),
    source: graph.indexOf(ends.source),
    sink: graph.indexOf(ends.sink),
    limit: options.amount ?? Infinity,
  });
}
