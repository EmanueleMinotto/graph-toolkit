export interface IndexEdge {
  readonly source: number;
  readonly target: number;
}

export interface EulerInput {
  readonly vertexCount: number;
  readonly edges: readonly IndexEdge[];
  readonly isDirected: boolean;
}

interface Unbalanced {
  readonly vertex: number;
  readonly value: number;
}

function pickStart(isDirected: boolean, unbalanced: readonly Unbalanced[], first: number): number {
  if (unbalanced.length === 0) {
    return first;
  }
  if (unbalanced.length !== 2) {
    return -1;
  }
  if (!isDirected) {
    return unbalanced[0]!.vertex;
  }
  const start = unbalanced.find((item) => item.value === 1);
  return start?.vertex ?? -1; // two unbalanced vertices always sum to zero, so +1 pairs with -1
}

/** Start vertex of an Eulerian trail, or -1 when the degree conditions fail. */
export function trailStart(input: EulerInput): number {
  const balance = new Int32Array(input.vertexCount);
  const degree = new Int32Array(input.vertexCount);
  for (const { source, target } of input.edges) {
    balance[source]!++;
    balance[target]! += input.isDirected ? -1 : 1;
    degree[source]!++;
    degree[target]!++;
  }
  const unbalanced = Array.from(balance, (value, vertex) => ({ vertex, value })).filter(
    ({ value }) => value !== 0 && (input.isDirected || value % 2 !== 0),
  );
  const first = degree.findIndex((count) => count > 0);
  return pickStart(input.isDirected, unbalanced, first);
}

function adjacencyOf(input: EulerInput): (readonly [number, number])[][] {
  const adjacency: [number, number][][] = Array.from({ length: input.vertexCount }, () => []);
  for (const [id, { source, target }] of input.edges.entries()) {
    adjacency[source]!.push([target, id]);
    if (!input.isDirected) {
      adjacency[target]!.push([source, id]);
    }
  }
  return adjacency;
}

/** Hierholzer: vertex sequence using every edge once, starting at `start`. */
export function hierholzer(input: EulerInput, start: number): number[] {
  const adjacency = adjacencyOf(input);
  const used = new Uint8Array(input.edges.length);
  const stack = [start];
  const trail: number[] = [];
  while (stack.length > 0) {
    const arcs = adjacency[stack.at(-1)!]!;
    while (arcs.length > 0 && used[arcs.at(-1)![1]] === 1) {
      arcs.pop();
    }
    const next = arcs.pop();
    if (next === undefined) {
      trail.push(stack.pop()!);
      continue;
    }
    used[next[1]] = 1;
    stack.push(next[0]);
  }
  return trail.toReversed();
}
