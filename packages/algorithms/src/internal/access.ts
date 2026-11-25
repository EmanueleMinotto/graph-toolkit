/** Indexed read for in-bounds typed-array access (callers guarantee the index). */
export function valueAt(values: ArrayLike<number>, index: number): number {
  return values[index]!;
}
