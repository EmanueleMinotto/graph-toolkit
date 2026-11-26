export interface Arc {
  readonly from: number;
  readonly to: number;
  readonly capacity: number;
  readonly cost: number;
}

export interface FlowResult {
  readonly flow: number;
  readonly cost: number;
}

export interface Problem {
  readonly count: number;
  readonly arcs: readonly Arc[];
  readonly source: number;
  readonly sink: number;
  /** Flow to send at most. */
  readonly limit: number;
}

interface Network {
  readonly to: number[];
  readonly capacity: number[];
  readonly cost: number[];
  readonly adjacency: number[][];
}

function build(problem: Problem): Network {
  const adjacency = Array.from({ length: problem.count }, (): number[] => []);
  const network: Network = { to: [], capacity: [], cost: [], adjacency };

  for (const arc of problem.arcs) {
    adjacency[arc.from]!.push(network.to.length);
    adjacency[arc.to]!.push(network.to.length + 1);
    network.to.push(arc.to, arc.from);
    network.capacity.push(arc.capacity, 0);
    network.cost.push(arc.cost, -arc.cost);
  }

  return network;
}

interface Search {
  readonly distance: number[];
  readonly parentEdge: number[];
  readonly queue: number[];
  readonly queued: Set<number>;
}

function relaxFrom(network: Network, search: Search, vertex: number): void {
  const outgoing = network.adjacency[vertex]!;

  for (const edge of outgoing) {
    const target = network.to[edge]!;
    const candidate = search.distance[vertex]! + network.cost[edge]!;

    if (network.capacity[edge]! <= 0 || candidate >= search.distance[target]!) {
      continue;
    }

    search.distance[target] = candidate;
    search.parentEdge[target] = edge;

    if (search.queued.has(target)) {
      continue;
    }

    search.queued.add(target);
    search.queue.push(target);
  }
}

/** Queue-based Bellman-Ford (SPFA) over residual arcs with spare capacity. */
function cheapestPath(network: Network, source: number): Search {
  const count = network.adjacency.length;
  const distance = Array.from({ length: count }, () => Infinity);
  const search: Search = {
    distance,
    parentEdge: Array.from({ length: count }, () => -1),
    queue: [source],
    queued: new Set([source]),
  };

  distance[source] = 0;

  for (let head = 0; head < search.queue.length; head++) {
    const vertex = search.queue[head]!;

    search.queued.delete(vertex);
    relaxFrom(network, search, vertex);
  }

  return search;
}

/** Edges of the cheapest path, sink first. */
function pathTo(network: Network, search: Search, problem: Problem): number[] {
  const edges: number[] = [];

  for (let vertex = problem.sink; vertex !== problem.source;) {
    const edge = search.parentEdge[vertex]!;

    edges.push(edge);
    vertex = network.to[edge ^ 1]!;
  }

  return edges;
}

function push(network: Network, edges: readonly number[], amount: number): void {
  for (const edge of edges) {
    network.capacity[edge]! -= amount;
    network.capacity[edge ^ 1]! += amount;
  }
}

/** Successive shortest paths: pushes up to `problem.limit` units at minimum cost. */
export function minCostFlowKernel(problem: Problem): FlowResult {
  const network = build(problem);
  let [flow, cost] = [0, 0];

  while (flow < problem.limit) {
    const search = cheapestPath(network, problem.source);
    const unitCost = search.distance[problem.sink]!;

    if (unitCost === Infinity) {
      break;
    }

    const edges = pathTo(network, search, problem);
    const amount = Math.min(problem.limit - flow, ...edges.map((edge) => network.capacity[edge]!));

    push(network, edges, amount);
    flow += amount;
    cost += amount * unitCost;
  }

  return { flow, cost };
}
