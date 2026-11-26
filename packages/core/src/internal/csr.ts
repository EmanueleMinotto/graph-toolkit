import type { Csr } from '../types.js';

export interface EdgeList {
  readonly sources: readonly number[];
  readonly targets: readonly number[];
  readonly weights: readonly number[];
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

/** Counting-sort build, O(V + E). Arcs keep insertion order per vertex. */
export function buildCsr(vertexCount: number, list: EdgeList, directed: boolean): Csr {
  const arcs = directed ? list : symmetrize(list);
  const offsets = prefixSums(vertexCount, arcs.sources);
  const cursor = offsets.slice(0, vertexCount);
  const targets = new Uint32Array(arcs.sources.length);
  const weights = new Float64Array(arcs.sources.length);

  for (let arc = 0; arc < arcs.sources.length; arc++) {
    const slot = cursor[arcs.sources[arc]!]!++;

    targets[slot] = arcs.targets[arc]!;
    weights[slot] = arcs.weights[arc]!;
  }

  return { offsets, targets, weights };
}

/** Out-degree of `vertex`, counting each stored arc once. */
export function outDegree(csr: Csr, vertex: number): number {
  return csr.offsets[vertex + 1]! - csr.offsets[vertex]!;
}

export interface Arc {
  readonly target: number;
  readonly weight: number;
}

/** Arcs of `vertex` whose target satisfies `keep`. */
export function arcsOf(csr: Csr, vertex: number, keep: (target: number) => boolean): Arc[] {
  const arcs: Arc[] = [];

  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const target = csr.targets[slot]!;

    if (keep(target)) {
      arcs.push({ target, weight: csr.weights[slot]! });
    }
  }

  return arcs;
}
