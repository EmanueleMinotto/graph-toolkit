const MAX_SWEEPS = 100;
const EPSILON = 1e-12;

interface Grid {
  readonly data: Float64Array;
  readonly size: number;
  /** Accumulated rotations: column i is the eigenvector of diagonal entry i. */
  readonly vectors: Float64Array;
}

function offDiagonal({ data, size }: Grid): number {
  let sum = 0;
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) {
      sum += data[row * size + column]! ** 2;
    }
  }
  return sum;
}

interface Turn {
  readonly p: number;
  readonly q: number;
  readonly cos: number;
  readonly sin: number;
}

/** Rotates columns p and q of a row-major matrix. */
function turnColumns(cells: Float64Array, size: number, { p, q, cos, sin }: Turn): void {
  for (let k = 0; k < size; k++) {
    const [kp, kq] = [cells[k * size + p]!, cells[k * size + q]!];
    cells[k * size + p] = cos * kp - sin * kq;
    cells[k * size + q] = sin * kp + cos * kq;
  }
}

/** Rotates rows p and q of a row-major matrix. */
function turnRows(cells: Float64Array, size: number, { p, q, cos, sin }: Turn): void {
  for (let k = 0; k < size; k++) {
    const [pk, qk] = [cells[p * size + k]!, cells[q * size + k]!];
    cells[p * size + k] = cos * pk - sin * qk;
    cells[q * size + k] = sin * pk + cos * qk;
  }
}

/** Applies the Jacobi rotation that zeroes entry (p, q), in place on a symmetric matrix. */
function rotate({ data, size, vectors }: Grid, p: number, q: number): void {
  const apq = data[p * size + q]!;
  if (apq === 0) {
    return;
  }
  const theta = (data[q * size + q]! - data[p * size + p]!) / (2 * apq);
  const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.hypot(theta, 1));
  const cos = 1 / Math.hypot(t, 1);
  const turn: Turn = { p, q, cos, sin: t * cos };
  turnColumns(data, size, turn);
  turnRows(data, size, turn);
  turnColumns(vectors, size, turn);
}

export interface Eigen {
  /** Ascending. */
  readonly values: number[];
  /** `vectors[i]` is the unit eigenvector of `values[i]`. */
  readonly vectors: number[][];
}

/** Eigenpairs of a symmetric row-major matrix by cyclic Jacobi sweeps, O(n³) per sweep. */
export function jacobiEigen(matrix: Float64Array, size: number): Eigen {
  const identity = Float64Array.from({ length: size * size }, (_, cell) =>
    cell % (size + 1) === 0 ? 1 : 0,
  );
  const grid: Grid = { data: Float64Array.from(matrix), size, vectors: identity };
  for (let sweep = 0; sweep < MAX_SWEEPS && offDiagonal(grid) > EPSILON; sweep++) {
    for (let p = 0; p < size; p++) {
      for (let q = p + 1; q < size; q++) {
        rotate(grid, p, q);
      }
    }
  }
  const order = Array.from({ length: size }, (_, index) => index).toSorted(
    (a, b) => grid.data[a * size + a]! - grid.data[b * size + b]!,
  );
  return {
    values: order.map((index) => grid.data[index * size + index]!),
    vectors: order.map((column) =>
      Array.from({ length: size }, (_, row) => grid.vectors[row * size + column]!),
    ),
  };
}

/** Eigenvalues of a symmetric row-major matrix, ascending. */
export const jacobiEigenvalues = (matrix: Float64Array, size: number): number[] =>
  jacobiEigen(matrix, size).values;
