export type Adjacency = ReadonlyMap<number, ReadonlySet<number>>;

export interface PathRule {
  readonly isGoal: (vertex: number) => boolean;
  /** Arcs that must not be used. */
  readonly isBlocked: (from: number, to: number) => boolean;
}

function unwind(parent: ReadonlyMap<number, number>, goal: number): number[] {
  const path = [goal];

  for (let node = parent.get(goal)!; node !== -1; node = parent.get(node)!) {
    path.push(node);
  }

  return path.toReversed();
}

interface Frontier {
  readonly adjacency: Adjacency;
  readonly rule: PathRule;
  readonly parent: Map<number, number>;
  readonly queue: number[];
}

/** Expands `vertex`; returns the goal vertex if one is reached. */
function expand(frontier: Frontier, vertex: number): number | undefined {
  const neighbors = frontier.adjacency.get(vertex)!;

  for (const next of neighbors) {
    if (frontier.parent.has(next) || frontier.rule.isBlocked(vertex, next)) {
      continue;
    }

    frontier.parent.set(next, vertex);

    if (frontier.rule.isGoal(next)) {
      return next;
    }

    frontier.queue.push(next);
  }

  return undefined;
}

/** Shortest path from `from` to a goal vertex under `rule`; empty when none exists. */
export function findPath(adjacency: Adjacency, from: number, rule: PathRule): number[] {
  const frontier: Frontier = { adjacency, rule, parent: new Map([[from, -1]]), queue: [from] };

  for (let head = 0; head < frontier.queue.length; head++) {
    const goal = expand(frontier, frontier.queue[head]!);

    if (goal !== undefined) {
      return unwind(frontier.parent, goal);
    }
  }

  /* v8 ignore next -- unreachable for biconnected blocks: every query has a path */
  return [];
}
