const MAX_SWEEPS = 100;
const EPSILON = 1e-12;

interface Grid {
  readonly data: Float64Array;
  readonly size: number;
}

function offDiagonal({ data, size }: Grid): number {
  let sum = 0;
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) sum += data[row * size + column]! ** 2;
  }
  return sum;
}

/** Applies the Jacobi rotation that zeroes entry (p, q), in place on a symmetric matrix. */
function rotate({ data, size }: Grid, p: number, q: number): void {
  const apq = data[p * size + q]!;
  if (apq === 0) return;
  const theta = (data[q * size + q]! - data[p * size + p]!) / (2 * apq);
  const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.hypot(theta, 1));
  const c = 1 / Math.hypot(t, 1);
  const s = t * c;
  for (let k = 0; k < size; k++) {
    const [kp, kq] = [data[k * size + p]!, data[k * size + q]!];
    data[k * size + p] = c * kp - s * kq;
    data[k * size + q] = s * kp + c * kq;
  }
  for (let k = 0; k < size; k++) {
    const [pk, qk] = [data[p * size + k]!, data[q * size + k]!];
    data[p * size + k] = c * pk - s * qk;
    data[q * size + k] = s * pk + c * qk;
  }
}

/** Eigenvalues of a symmetric row-major matrix by cyclic Jacobi sweeps, O(n³) per sweep. */
export function jacobiEigenvalues(matrix: Float64Array, size: number): number[] {
  const grid: Grid = { data: Float64Array.from(matrix), size };
  for (let sweep = 0; sweep < MAX_SWEEPS && offDiagonal(grid) > EPSILON; sweep++) {
    for (let p = 0; p < size; p++) {
      for (let q = p + 1; q < size; q++) rotate(grid, p, q);
    }
  }
  return Array.from({ length: size }, (_, index) => grid.data[index * size + index]!).toSorted(
    (a, b) => a - b,
  );
}
