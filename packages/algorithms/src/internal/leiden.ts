import type { Network } from './centrality.js';
import { renumber } from './community.js';
import {
  add,
  aggregate,
  degrees,
  firstLevel,
  identity,
  localMoving,
  scaleOf,
  sumOf,
  totalsOf,
  type Level,
  type LouvainSettings,
} from './louvain.js';

const EPSILON = 1e-12;

/** State of the refinement phase: singletons are merged inside the communities of `partition`. */
interface Refining {
  readonly level: Level;
  readonly partition: Int32Array;
  readonly refined: Int32Array;
  readonly degree: Float64Array;
  /** Total degree per community of `partition`. */
  readonly community: Float64Array;
  /** Total degree per refined group. */
  readonly group: Float64Array;
  /** Weight from each refined group to the rest of its community. */
  readonly outside: Float64Array;
  readonly size: Int32Array;
  readonly scale: number;
}

interface Move {
  readonly node: number;
  /** Weight from the node to each refined group inside its community. */
  readonly links: Map<number, number>;
}

function linksWithin(refining: Refining, node: number): Map<number, number> {
  const links = new Map<number, number>();
  const row = refining.level[node]!;

  for (const [other, weight] of row) {
    if (other !== node && refining.partition[other] === refining.partition[node]) {
      add(links, refining.refined[other]!, weight);
    }
  }

  return links;
}

/** Weight a part of degree `degree` would send outside itself if it were spread at random. */
const expectedLinks = (refining: Refining, degree: number, community: number): number =>
  refining.scale * degree * (community - degree);

/** Gain of joining `group`, or −∞ when the group is not well connected to the rest of the community. */
function score(refining: Refining, { node, links }: Move, group: number): number {
  const total = refining.community[refining.partition[node]!]!;
  const isConnected =
    refining.outside[group]! >= expectedLinks(refining, refining.group[group]!, total) - EPSILON;
  const gain = links.get(group)! - refining.scale * refining.degree[node]! * refining.group[group]!;

  return isConnected && gain >= 0 ? gain : -Infinity;
}

/** The best refined group to join (lowest label on ties), or −1 to stay alone. */
function bestGroup(refining: Refining, move: Move): number {
  const candidates = [...move.links.keys()].toSorted((left, right) => left - right);
  let [best, bestScore] = [-1, -Infinity];

  for (const group of candidates) {
    const value = score(refining, move, group);

    if (value > bestScore) {
      [best, bestScore] = [group, value];
    }
  }

  return best;
}

function merge(refining: Refining, move: Move, target: number): void {
  const { refined, size, group, outside, degree } = refining;
  const { node, links } = move;

  refined[node] = target;
  size[target]!++;
  size[node]!--;
  group[target]! += degree[node]!;
  group[node] = 0;
  outside[target]! += outside[node]! - 2 * links.get(target)!;
}

function refineNode(refining: Refining, node: number): void {
  if (refining.size[refining.refined[node]!] !== 1) {
    return;
  }

  const total = refining.community[refining.partition[node]!]!;
  const isConnected =
    refining.outside[node]! >= expectedLinks(refining, refining.degree[node]!, total) - EPSILON;

  if (!isConnected) {
    return;
  }

  const move: Move = { node, links: linksWithin(refining, node) };
  const target = bestGroup(refining, move);

  if (target >= 0) {
    merge(refining, move, target);
  }
}

/** Phase 2 of Leiden: merges well-connected singletons into well-connected groups inside each community. */
export function refine(level: Level, partition: Int32Array, settings: LouvainSettings): Int32Array {
  const degree = degrees(level);
  const refining: Refining = {
    level,
    partition,
    refined: identity(level.length),
    degree,
    community: totalsOf(degree, partition),
    group: Float64Array.from(degree),
    outside: new Float64Array(level.length),
    size: new Int32Array(level.length).fill(1),
    scale: scaleOf(degree, settings.resolution),
  };

  for (let node = 0; node < level.length; node++) {
    refining.outside[node] = sumOf(linksWithin(refining, node).values());
  }

  for (let node = 0; node < level.length; node++) {
    refineNode(refining, node);
  }

  return refining.refined;
}

const countOf = (labels: readonly number[]): number =>
  labels.reduce((top, label) => Math.max(top, label), -1) + 1;

/** Leiden: local moving, refinement, then aggregation of the refined groups; one label per vertex. */
export function leiden(
  { csr, vertexCount, isDirected }: Network,
  settings: LouvainSettings,
): number[] {
  let level = firstLevel(csr, vertexCount, isDirected);
  let membership = Array.from({ length: vertexCount }, (_, node) => node);
  let start = identity(level.length);

  for (;;) {
    const partition = localMoving(level, settings, start);
    const communities = renumber(partition);
    const result = membership.map((node) => communities[node]!);
    const groups = renumber(refine(level, partition, settings));
    const groupCount = countOf(groups);

    if (countOf(communities) === level.length || groupCount === level.length) {
      return result;
    }

    // Each aggregated vertex starts in the community its members were in.
    start = new Int32Array(groupCount);

    for (const [node, group] of groups.entries()) {
      start[group] = communities[node]!;
    }

    membership = membership.map((node) => groups[node]!);
    level = aggregate(level, groups, groupCount);
  }
}
