import type { Csr } from '../types.js';

export interface EdgeList {
  readonly sources: readonly number[];
  readonly targets: readonly number[];
  readonly weights: readonly number[];
  /** Record which edge each arc came from (needed for edge attributes). */
  readonly trackEdges?: boolean;
}

function symmetrize(list: EdgeList): EdgeList {
  const sources = [...list.sources];
  const targets = [...list.targets];
  const weights = [...list.weights];

  for (let index = 0; index < list.sources.length; index++) {
    const source = list.sources[index]!;
    const target = list.targets[index]!;

    if (source === target) {
      continue;
    }

    sources.push(target);
    targets.push(source);
    weights.push(list.weights[index]!);
  }

  return { sources, targets, weights };
}

/** Edge ordinal behind each arc, in the order {@link symmetrize} lays the arcs out. */
function originsOf(list: EdgeList, directed: boolean): number[] {
  const own = list.sources.map((_, index) => index);

  return directed
    ? own
    : [...own, ...own.filter((index) => list.sources[index] !== list.targets[index])];
}

function prefixSums(vertexCount: number, sources: readonly number[]): Uint32Array {
  const offsets = new Uint32Array(vertexCount + 1);

  for (const source of sources) {
    offsets[source + 1]!++;
  }

  for (let vertex = 0; vertex < vertexCount; vertex++) {
    offsets[vertex + 1]! += offsets[vertex]!;
  }

  return offsets;
}

interface Placed {
  readonly targets: Uint32Array;
  readonly weights: Float64Array;
  /** CSR slot taken by each arc of the input list. */
  readonly slots: Uint32Array;
}

/** Counting sort of the arcs by source. */
function place(arcs: EdgeList, offsets: Uint32Array): Placed {
  const cursor = offsets.slice(0, -1);
  const placed: Placed = {
    targets: new Uint32Array(arcs.sources.length),
    weights: new Float64Array(arcs.sources.length),
    slots: new Uint32Array(arcs.sources.length),
  };

  for (let arc = 0; arc < arcs.sources.length; arc++) {
    const slot = cursor[arcs.sources[arc]!]!++;

    placed.targets[slot] = arcs.targets[arc]!;
    placed.weights[slot] = arcs.weights[arc]!;
    placed.slots[arc] = slot;
  }

  return placed;
}

/** Edge ordinal per CSR slot. */
function edgesBySlot(origins: readonly number[], slots: Uint32Array): Uint32Array {
  const arcEdges = new Uint32Array(slots.length);

  for (let arc = 0; arc < slots.length; arc++) {
    arcEdges[slots[arc]!] = origins[arc]!;
  }

  return arcEdges;
}

/** Counting-sort build, $O(V + E)$. Arcs keep insertion order per vertex. */
export function buildCsr(vertexCount: number, list: EdgeList, directed: boolean): Csr {
  const arcs = directed ? list : symmetrize(list);
  const offsets = prefixSums(vertexCount, arcs.sources);
  const { targets, weights, slots } = place(arcs, offsets);

  return list.trackEdges === true
    ? { offsets, targets, weights, arcEdges: edgesBySlot(originsOf(list, directed), slots) }
    : { offsets, targets, weights };
}

/** Out-degree of `vertex`, counting each stored arc once. */
export function outDegree(csr: Csr, vertex: number): number {
  return csr.offsets[vertex + 1]! - csr.offsets[vertex]!;
}

export interface Arc {
  readonly target: number;
  readonly weight: number;
  /** Insertion ordinal of the edge behind the arc, when the CSR tracks it. */
  readonly edge: number | undefined;
}

/** Arcs of `vertex` whose target satisfies `keep`. */
export function arcsOf(csr: Csr, vertex: number, keep: (target: number) => boolean): Arc[] {
  const arcs: Arc[] = [];

  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const target = csr.targets[slot]!;

    if (keep(target)) {
      arcs.push({ target, weight: csr.weights[slot]!, edge: csr.arcEdges?.[slot] });
    }
  }

  return arcs;
}
