import type { Csr } from '@graph-sdk/core';

export type Entry = readonly [row: number, column: number, value: number];

/** Sums parallel arcs, so multigraph entries count (or add up) multiplicities. */
export function adjacencyData(csr: Csr, size: number, isWeighted: boolean): Float64Array {
  const data = new Float64Array(size * size);

  for (let row = 0; row < size; row++) {
    for (let slot = csr.offsets[row]!; slot < csr.offsets[row + 1]!; slot++) {
      data[row * size + csr.targets[slot]!]! += isWeighted ? csr.weights[slot]! : 1;
    }
  }

  return data;
}

/** L = D - A where D holds off-diagonal row sums (loops ignored). */
export function laplacianData(adjacency: Float64Array, size: number): Float64Array {
  const data = new Float64Array(size * size);

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (row === column) {
        continue;
      }

      const value = adjacency[row * size + column]!;

      data[row * size + column] = 0 - value; // avoids -0
      data[row * size + row]! += value;
    }
  }

  return data;
}

/** (rows×inner)·(inner×columns), $O(\text{rows} \cdot \text{inner} \cdot \text{columns})$. */
export function multiplyData(
  left: Float64Array,
  right: Float64Array,
  shape: readonly [rows: number, inner: number, columns: number],
): Float64Array {
  const [rows, inner, columns] = shape;
  const data = new Float64Array(rows * columns);

  for (let row = 0; row < rows; row++) {
    for (let step = 0; step < inner; step++) {
      const factor = left[row * inner + step]!;

      for (let column = 0; column < columns; column++) {
        data[row * columns + column]! += factor * right[step * columns + column]!;
      }
    }
  }

  return data;
}

export function identityData(size: number): Float64Array {
  const data = new Float64Array(size * size);

  for (let index = 0; index < size; index++) {
    data[index * size + index] = 1;
  }

  return data;
}

/** Exponentiation by squaring, $O(n^3 \log k)$. */
export function powerData(base: Float64Array, size: number, exponent: number): Float64Array {
  let result = identityData(size);
  let square = base;

  for (let remaining = exponent; remaining > 0; remaining = Math.floor(remaining / 2)) {
    if (remaining % 2 === 1) {
      result = multiplyData(result, square, [size, size, size]);
    }

    square = multiplyData(square, square, [size, size, size]);
  }

  return result;
}

export function isSymmetric(data: Float64Array, size: number): boolean {
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) {
      if (data[row * size + column] !== data[column * size + row]) {
        return false;
      }
    }
  }

  return true;
}

/** Non-zero entries; `upperOnly` keeps column >= row (for symmetric matrices). */
export function nonZeroEntries(data: Float64Array, size: number, isUpperOnly: boolean): Entry[] {
  const entries: Entry[] = [];

  for (let row = 0; row < size; row++) {
    for (let column = isUpperOnly ? row : 0; column < size; column++) {
      const value = data[row * size + column]!;

      if (value !== 0) {
        entries.push([row, column, value]);
      }
    }
  }

  return entries;
}

export function cellAt(data: Float64Array, index: number): number {
  return data[index]!;
}

/** Row-major vertices × edges incidence data; `pairs` are (source, target) index pairs. */
export function incidenceData(
  size: number,
  pairs: readonly (readonly [number, number])[],
  isDirected: boolean,
): Float64Array {
  const data = new Float64Array(size * pairs.length);

  for (const [column, [from, to]] of pairs.entries()) {
    data[from * pairs.length + column] = isDirected ? -1 : 1;
    data[to * pairs.length + column] = 1;
  }

  return data;
}
