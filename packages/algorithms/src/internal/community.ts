import type { Csr } from '@graph-sdk/core';

interface Moving {
  readonly csr: Csr;
  readonly community: Int32Array;
  /** Sum of degrees per community. */
  readonly total: Float64Array;
  /** Twice the number of edges. */
  readonly twiceEdges: number;
}

const degreeOf = (csr: Csr, vertex: number): number =>
  csr.offsets[vertex + 1]! - csr.offsets[vertex]!;

/** Edge counts from `vertex` into each neighboring community (loops ignored). */
function linksByCommunity({ csr, community }: Moving, vertex: number): Map<number, number> {
  const links = new Map<number, number>();
  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const target = csr.targets[slot]!;
    if (target === vertex) {
      continue;
    }
    const group = community[target]!;
    links.set(group, (links.get(group) ?? 0) + 1);
  }
  return links;
}

function bestCommunity(moving: Moving, vertex: number): number {
  const degree = degreeOf(moving.csr, vertex);
  const links = linksByCommunity(moving, vertex);
  const gain = (group: number): number =>
    (links.get(group) ?? 0) - (moving.total[group]! * degree) / moving.twiceEdges;
  const own = moving.community[vertex]!;
  let best = own;
  const candidates = [...links.keys()].toSorted((left, right) => left - right);
  for (const group of candidates) {
    if (gain(group) > gain(best) + Number.EPSILON) {
      best = group;
    }
  }
  return best;
}

function moveVertex(moving: Moving, vertex: number): boolean {
  const degree = degreeOf(moving.csr, vertex);
  const own = moving.community[vertex]!;
  moving.total[own]! -= degree;
  const best = bestCommunity(moving, vertex);
  moving.total[best]! += degree;
  moving.community[vertex] = best;
  return best !== own;
}

/** Greedy modularity local moving (Louvain phase 1), deterministic, O(rounds · E). */
export function localMoving(csr: Csr, vertexCount: number, maxRounds: number): Int32Array {
  const community = Int32Array.from({ length: vertexCount }, (_, vertex) => vertex);
  const total = Float64Array.from(community, (_, vertex) => degreeOf(csr, vertex));
  const moving: Moving = { csr, community, total, twiceEdges: Math.max(csr.targets.length, 1) };
  for (let round = 0; round < maxRounds; round++) {
    let isMoved = false;
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      isMoved = moveVertex(moving, vertex) || isMoved;
    }
    if (!isMoved) {
      break;
    }
  }
  return community;
}

/** Renumbers labels 0, 1, 2… in order of first appearance. */
export function renumber(labels: Int32Array): number[] {
  const numbering = new Map<number, number>();
  return Array.from(labels, (label) => {
    if (!numbering.has(label)) {
      numbering.set(label, numbering.size);
    }
    return numbering.get(label)!;
  });
}
