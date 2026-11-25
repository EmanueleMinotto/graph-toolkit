import { GraphError } from '@graph-toolkit/core';
import { cellAt, multiplyData, powerData } from './internal/dense.js';

/** Immutable dense row-major matrix of doubles. */
export class Matrix {
  public readonly rows: number;
  public readonly columns: number;
  readonly #data: Float64Array;

  /** Copies `data`; its length must equal `rows * columns`. */
  public constructor(rows: number, columns: number, data: ArrayLike<number>) {
    if (data.length !== rows * columns) throw new RangeError('data length must be rows * columns');
    this.rows = rows;
    this.columns = columns;
    this.#data = Float64Array.from(data);
  }

  public static fromRows(rows: readonly (readonly number[])[]): Matrix {
    return new Matrix(rows.length, rows[0]?.length ?? 0, rows.flat());
  }

  public get(row: number, column: number): number {
    const isInside = row >= 0 && row < this.rows && column >= 0 && column < this.columns;
    if (!isInside) throw new RangeError('index out of bounds');
    return cellAt(this.#data, row * this.columns + column);
  }

  public toRows(): readonly (readonly number[])[] {
    return Array.from({ length: this.rows }, (_, row) => [
      ...this.#data.subarray(row * this.columns, (row + 1) * this.columns),
    ]);
  }

  public multiply(other: Matrix): Matrix {
    if (this.columns !== other.rows) throw new RangeError('incompatible shapes');
    const shape = [this.rows, this.columns, other.columns] as const;
    return new Matrix(this.rows, other.columns, multiplyData(this.#data, other.#data, shape));
  }

  /** `exponent` ≥ 0 on a square matrix; entry (i, j) of A^k counts k-walks i → j. */
  public power(exponent: number): Matrix {
    if (this.rows !== this.columns) throw new GraphError('power requires a square matrix');
    return new Matrix(this.rows, this.columns, powerData(this.#data, this.rows, exponent));
  }

  /** Raw row-major copy for kernels. */
  public toArray(): Float64Array {
    return Float64Array.from(this.#data);
  }
}
