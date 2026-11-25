import type { Csr } from '@graph-toolkit/core';
import {
  arcSlot,
  pathCost,
  restrictedDijkstra,
  type Endpoints,
  type IndexPath,
} from './restricted.js';

const sameRoot = (path: readonly number[], root: readonly number[]): boolean =>
  root.every((vertex, index) => path[index] === vertex);

interface Round {
  readonly csr: Csr;
  readonly accepted: readonly IndexPath[];
}

function slotsToBlock(round: Round, root: readonly number[]): Set<number> {
  const spurIndex = root.length - 1;
  return new Set(
    round.accepted
      .filter((found) => found.path.length > root.length && sameRoot(found.path, root))
      .map((found) => arcSlot(round.csr, found.path[spurIndex]!, found.path[spurIndex + 1]!)),
  );
}

function spurCandidate(
  round: Round,
  previous: IndexPath,
  spurIndex: number,
): IndexPath | undefined {
  const root = previous.path.slice(0, spurIndex + 1);
  const endpoints: Endpoints = { source: root.at(-1)!, target: previous.path.at(-1)! };
  const tail = restrictedDijkstra(round.csr, endpoints, {
    blockedSlots: slotsToBlock(round, root),
    blockedVertices: new Set(root.slice(0, -1)),
  });
  if (tail === undefined) return undefined;
  const path = [...root.slice(0, -1), ...tail.path];
  return { path, cost: pathCost(round.csr, path) };
}

function candidatesAfter(round: Round): IndexPath[] {
  const previous = round.accepted.at(-1)!;
  return previous.path
    .slice(0, -1)
    .map((_, spurIndex) => spurCandidate(round, previous, spurIndex))
    .filter((candidate) => candidate !== undefined);
}

const isKnown = (paths: readonly IndexPath[], path: IndexPath): boolean =>
  paths.some((other) => other.path.join(',') === path.path.join(','));

/** Yen's k shortest loopless paths, O(k · V · (V + E) log V). */
export function yenKernel(csr: Csr, endpoints: Endpoints, count: number): IndexPath[] {
  const first = restrictedDijkstra(csr, endpoints, {
    blockedSlots: new Set(),
    blockedVertices: new Set(),
  });
  if (first === undefined || count < 1) return [];
  const accepted = [first];
  let pool: IndexPath[] = [];
  while (accepted.length < count) {
    const fresh = candidatesAfter({ csr, accepted }).filter(
      (path) => !isKnown(pool, path) && !isKnown(accepted, path),
    );
    pool = [...pool, ...fresh].toSorted((left, right) => left.cost - right.cost);
    const best = pool.shift();
    if (best === undefined) break;
    accepted.push(best);
  }
  return accepted;
}
