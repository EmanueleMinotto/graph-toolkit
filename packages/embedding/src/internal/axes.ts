import type { VertexId } from '@graph-sdk/core';

/** Flips the vector so its largest-magnitude entry is positive: eigenvectors are sign-ambiguous. */
function oriented(vector: readonly number[]): readonly number[] {
  const pivot = vector.reduce(
    (best, value) => (Math.abs(value) > Math.abs(best) ? value : best),
    0,
  );

  return pivot < 0 ? vector.map((value) => -value) : vector;
}

/** Per-vertex coordinates from eigenvectors 1..`dimensions` (0 is the trivial constant one). */
export function coordinates(
  ids: readonly VertexId[],
  vectors: readonly (readonly number[])[],
  dimensions: number,
): ReadonlyMap<VertexId, readonly number[]> {
  const axes = vectors.slice(1, dimensions + 1).map((vector) => oriented(vector));

  return new Map(ids.map((id, index) => [id, axes.map((axis) => axis[index]!)]));
}
