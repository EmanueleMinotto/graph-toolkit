export interface Arc {
  readonly from: number;
  readonly to: number;
  readonly weight: number;
}

interface Linked extends Arc {
  /** Index of the input arc this one descends from. */
  readonly index: number;
  /** The arc it replaces one contraction level up. */
  readonly parent: Linked | undefined;
}

interface Contraction {
  readonly component: Int32Array;
  readonly cycles: number;
}

function cheapestIncoming(
  count: number,
  arcs: readonly Linked[],
  root: number,
): (Linked | undefined)[] {
  // eslint-disable-next-line unicorn/no-useless-undefined -- explicit holes-free "none yet" slots
  const best: (Linked | undefined)[] = Array.from({ length: count }, () => undefined);

  for (const arc of arcs) {
    const current = best[arc.to];

    if (
      arc.from !== arc.to &&
      arc.to !== root &&
      (current === undefined || arc.weight < current.weight)
    ) {
      best[arc.to] = arc;
    }
  }

  return best;
}

function walkToCycle(
  best: readonly (Linked | undefined)[],
  seen: Int32Array,
  start: number,
): number {
  let vertex = start;

  while (seen[vertex] !== start && best[vertex] !== undefined) {
    seen[vertex] = start;
    vertex = best[vertex]!.from;
  }

  return seen[vertex] === start ? vertex : -1;
}

/** Gives every vertex outside a cycle its own component number, after the cycles'. */
function numberRest(component: Int32Array, firstFree: number): void {
  let next = firstFree;

  for (let vertex = 0; vertex < component.length; vertex++) {
    if (component[vertex] === -1) {
      component[vertex] = next++;
    }
  }
}

/** Numbers cycles of the chosen-arc graph (0..cycles-1), then everything else. */
function contract(best: readonly (Linked | undefined)[]): Contraction {
  const component = new Int32Array(best.length).fill(-1);
  const seen = new Int32Array(best.length).fill(-1);
  let cycles = 0;

  for (let start = 0; start < best.length; start++) {
    const meet = walkToCycle(best, seen, start);

    if (meet === -1 || component[meet] !== -1) {
      continue;
    }

    for (let vertex = meet; component[vertex] === -1; vertex = best[vertex]!.from) {
      component[vertex] = cycles;
    }

    cycles++;
  }

  numberRest(component, cycles);

  return { component, cycles };
}

function reduceArcs(
  arcs: readonly Linked[],
  best: readonly (Linked | undefined)[],
  component: Int32Array,
): Linked[] {
  return arcs
    .filter((arc) => component[arc.from] !== component[arc.to])
    .map((arc) => ({
      from: component[arc.from]!,
      to: component[arc.to]!,
      weight: arc.weight - (best[arc.to]?.weight ?? 0),
      index: arc.index,
      parent: arc,
    }));
}

/** Lifts arcs chosen on the contracted graph and re-adds each cycle's arcs except at its entry. */
function expand(
  best: readonly (Linked | undefined)[],
  chosen: readonly Linked[],
  contraction: Contraction,
): Linked[] {
  const lifted = chosen.map((arc) => arc.parent!);
  const entries = new Set(lifted.map((arc) => arc.to));
  const kept = best.filter(
    (arc, vertex) =>
      arc !== undefined &&
      contraction.component[vertex]! < contraction.cycles &&
      !entries.has(vertex),
  );

  return [...lifted, ...kept.filter((arc) => arc !== undefined)];
}

function solve(count: number, arcs: readonly Linked[], root: number): Linked[] | undefined {
  const best = cheapestIncoming(count, arcs, root);

  if (best.some((arc, vertex) => arc === undefined && vertex !== root)) {
    return undefined;
  }

  const contraction = contract(best);

  if (contraction.cycles === 0) {
    return best.filter((arc) => arc !== undefined);
  }

  const { component } = contraction;
  const reduced = reduceArcs(arcs, best, component);
  const inner = solve(Math.max(...component) + 1, reduced, component[root]!);

  return inner === undefined ? undefined : expand(best, inner, contraction);
}

/** Chu–Liu/Edmonds, O(V·E). Returns indices of `arcs` forming the cheapest arborescence. */
export function minimumArborescence(
  count: number,
  arcs: readonly Arc[],
  root: number,
): number[] | undefined {
  const tagged = arcs.map((arc, index): Linked => ({ ...arc, index, parent: undefined }));

  return solve(count, tagged, root)?.map((arc) => arc.index);
}

/** Items at `indices`, in that order. */
export const pick = <T>(items: readonly T[], indices: readonly number[]): T[] =>
  indices.map((index) => items[index]!);
