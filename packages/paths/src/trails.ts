import type { Graph, VertexId } from '@graph-toolkit/core';
import { hierholzer, trailStart, type EulerInput } from './internal/euler.js';
import { hamiltonian } from './internal/hamilton.js';

function eulerInput(graph: Graph): EulerInput {
  return {
    vertexCount: graph.vertexCount,
    isDirected: graph.directed,
    edges: graph
      .edges()
      .map((edge) => ({ source: graph.indexOf(edge.source), target: graph.indexOf(edge.target) })),
  };
}

/**
 * Eulerian trail (closed when all degrees are balanced) using every edge exactly once,
 * or `undefined` when none exists. O(V + E).
 */
export function eulerianTrail(graph: Graph): readonly VertexId[] | undefined {
  const input = eulerInput(graph);
  const start = trailStart(input);
  const trail = start === -1 ? [] : hierholzer(input, start);
  const isComplete = start !== -1 && trail.length === input.edges.length + 1;
  return isComplete ? trail.map((index) => graph.vertexAt(index)) : undefined;
}

const named = (
  graph: Graph,
  path: readonly number[] | undefined,
): readonly VertexId[] | undefined => path?.map((index) => graph.vertexAt(index));

/** Path visiting every vertex once (backtracking, exponential; keep V small). */
export function hamiltonianPath(graph: Graph): readonly VertexId[] | undefined {
  return named(graph, hamiltonian(graph.csr, graph.vertexCount, false));
}

/** Cycle visiting every vertex once, returned without repeating the start; needs V ≥ 3. */
export function hamiltonianCycle(graph: Graph): readonly VertexId[] | undefined {
  const minimumSize = 3;
  return graph.vertexCount < minimumSize
    ? undefined
    : named(graph, hamiltonian(graph.csr, graph.vertexCount, true));
}
