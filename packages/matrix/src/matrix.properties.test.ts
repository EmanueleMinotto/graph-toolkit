import type { Graph } from '@graph-sdk/core';
import { arbGraph, arbPermutation, BRUTE_FORCE, canonical, relabel } from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  adjacencyMatrix,
  adjacencySpectrum,
  algebraicConnectivity,
  eigenDecomposition,
  eigenvalues,
  graphFromAdjacency,
  incidenceMatrix,
  laplacianMatrix,
  laplacianSpectrum,
  Matrix,
} from './index.js';

const EPSILON = 1e-8;

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Square matrix with small integer entries (products stay exact in doubles). */
const arbSquare = fc
  .integer({ min: 1, max: 4 })
  .chain((size) =>
    fc.array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: size, maxLength: size }), {
      minLength: size,
      maxLength: size,
    }),
  )
  .map((rows) => Matrix.fromRows(rows));

const arbRows = (size: number) =>
  fc
    .array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: size, maxLength: size }), {
      minLength: size,
      maxLength: size,
    })
    .map((rows) => Matrix.fromRows(rows));

/** Three square matrices of the same size. */
const arbTriple = fc
  .integer({ min: 1, max: 4 })
  .chain((size) => fc.tuple(arbRows(size), arbRows(size), arbRows(size)));

const identity = (size: number): Matrix =>
  new Matrix(
    size,
    size,
    Array.from({ length: size * size }, (_, cell) =>
      Number(Math.floor(cell / size) === cell % size),
    ),
  );

const dot = (left: readonly number[], right: readonly number[]): number =>
  sum(left.map((value, index) => value * right[index]!));

const arbUndirected = arbGraph({ weighted: true, allowSelfLoops: true, maxN: 6 });
const arbSimple = arbGraph({ maxN: 6 });
const arbAny = fc
  .boolean()
  .chain((directed) => arbGraph({ directed, weighted: true, allowSelfLoops: true, maxN: 6 }));

/** Number of connected components by flooding (arcs taken both ways). */
function components(graph: Graph): number {
  const parent = new Map<string, string>(graph.vertices().map((id) => [id, id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));

  for (const { source, target } of graph.edges()) {
    parent.set(find(source), find(target));
  }

  return graph.vertices().filter((id) => find(id) === id).length;
}

/** Every arc of the graph as index pairs, both ways for undirected edges. */
const arcsOf = (graph: Graph): (readonly [number, number])[] =>
  graph.edges().flatMap(({ source, target }) => {
    const [from, to] = [graph.indexOf(source), graph.indexOf(target)];

    return from === to || graph.directed
      ? [[from, to] as const]
      : [[from, to] as const, [to, from] as const];
  });

/** Walks one step longer: every walk ending at an arc's start continues along it. */
function advance(
  counts: readonly (readonly number[])[],
  arcs: readonly (readonly [number, number])[],
): number[][] {
  const next = counts.map((row) => row.map(() => 0));

  for (const [start, end] of arcs) {
    for (const [origin, row] of next.entries()) {
      row[end]! += counts[origin]![start]!;
    }
  }

  return next;
}

/** Number of walks of length `steps` between every pair of vertices, one extension at a time. */
function walkCounts(graph: Graph, steps: number): number[][] {
  const arcs = arcsOf(graph);
  let counts = identity(graph.vertexCount)
    .toRows()
    .map((row) => [...row]);

  for (let step = 0; step < steps; step++) {
    counts = advance(counts, arcs);
  }

  return counts;
}

describe('matrix properties', () => {
  describe('Matrix', () => {
    it('multiplication is associative, distributes over powers and has an identity', () => {
      fc.assert(
        fc.property(
          arbTriple,
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 0, max: 3 }),
          ([a, b, c], index, k) => {
            expect(a.multiply(b).multiply(c).toRows()).toEqual(a.multiply(b.multiply(c)).toRows());
            expect(a.multiply(identity(a.rows)).toRows()).toEqual(a.toRows());
            expect(identity(a.rows).multiply(a).toRows()).toEqual(a.toRows());

            expect(a.power(index + k).toRows()).toEqual(
              a.power(index).multiply(a.power(k)).toRows(),
            );

            expect(a.power(0).toRows()).toEqual(identity(a.rows).toRows());
          },
        ),
      );
    });

    it('round-trips through rows and array, and rejects out-of-range access', () => {
      fc.assert(
        fc.property(arbSquare, (matrix) => {
          expect(Matrix.fromRows(matrix.toRows()).toRows()).toEqual(matrix.toRows());
          expect(matrix.toArray()).toEqual(Float64Array.from(matrix.toRows().flat()));

          expect(matrix.get(matrix.rows - 1, matrix.columns - 1)).toBe(
            matrix.toRows().at(-1)!.at(-1),
          );

          expect(() => matrix.get(matrix.rows, 0)).toThrow(RangeError);
          expect(() => matrix.get(0, -1)).toThrow(RangeError);
        }),
      );
    });
  });

  describe('graph matrices', () => {
    it('graphFromAdjacency inverts adjacencyMatrix on weighted graphs', () => {
      fc.assert(
        fc.property(
          fc
            .boolean()
            .chain((directed) =>
              arbGraph({ directed, weighted: true, allowSelfLoops: true, maxN: 6 }),
            ),
          (graph) => {
            const back = graphFromAdjacency(adjacencyMatrix(graph, { isWeighted: true }), {
              isDirected: graph.directed,
            });

            expect(canonical(back)).toEqual(canonical(graph));
          },
        ),
        BRUTE_FORCE,
      );
    });

    it('A^k counts the walks of length k', () => {
      fc.assert(
        fc.property(arbAny, fc.integer({ min: 0, max: 4 }), (graph, steps) => {
          const counted = adjacencyMatrix(graph).power(steps).toRows();

          expect(counted).toEqual(walkCounts(graph, steps));
        }),
        BRUTE_FORCE,
      );
    });

    it('the Laplacian is symmetric with zero row sums and equals D - A', () => {
      fc.assert(
        fc.property(arbUndirected, (graph) => {
          const laplacian = laplacianMatrix(graph, { isWeighted: true }).toRows();
          const adjacency = adjacencyMatrix(graph, { isWeighted: true }).toRows();

          for (const [row, values] of laplacian.entries()) {
            expect(sum(values)).toBeCloseTo(0, 9);
            expect(values[row]).toBe(sum(adjacency[row]!) - adjacency[row]![row]!);

            expect(values.map((value, column) => value - laplacian[column]![row]!)).toEqual(
              values.map(() => 0),
            );
          }
        }),
      );
    });

    it('incidence columns have the expected signs and B·Bᵀ is the Laplacian of the underlying graph', () => {
      fc.assert(
        fc.property(
          fc.boolean().chain((directed) => arbGraph({ directed, maxN: 6 })),
          (graph) => {
            const incidence = incidenceMatrix(graph).toRows();
            const columns =
              incidence[0]?.map((_, column) => incidence.map((row) => row[column]!)) ?? [];
            const gram = incidence.map((row) =>
              incidence.map((other) => sum(row.map((value, column) => value * other[column]!))),
            );
            const adjacency = adjacencyMatrix(graph).toRows();
            const sign = graph.directed ? -1 : 1;
            const degree = (row: number): number =>
              sum(adjacency[row]!) +
              (graph.directed ? sum(adjacency.map((values) => values[row]!)) : 0);

            expect(columns.every((column) => sum(column) === (graph.directed ? 0 : 2))).toBe(true);
            expect(gram.every((row, index) => row[index] === degree(index))).toBe(true);

            expect(
              gram.every((row, index) =>
                row.every(
                  (value, other) =>
                    other === index ||
                    value ===
                      sign *
                        (adjacency[index]![other]! +
                          (graph.directed ? adjacency[other]![index]! : 0)),
                ),
              ),
            ).toBe(true);
          },
        ),
      );
    });
  });

  describe('spectrum', () => {
    it('eigenvalues are ascending, sum to the trace and their squares sum to the squared entries', () => {
      fc.assert(
        fc.property(arbUndirected, (graph) => {
          const matrix = adjacencyMatrix(graph, { isWeighted: true });
          const values = eigenvalues(matrix);
          const rows = matrix.toRows();

          expect(values.toSorted((a, b) => a - b)).toEqual(values);
          expect(sum(values)).toBeCloseTo(sum(rows.map((row, index) => row[index]!)), 6);

          expect(sum(values.map((value) => value * value))).toBeCloseTo(
            sum(rows.flat().map((value) => value * value)),
            6,
          );
        }),
        BRUTE_FORCE,
      );
    });

    it('eigenvectors are orthonormal and satisfy A v = λ v', () => {
      fc.assert(
        fc.property(arbUndirected, (graph) => {
          const matrix = adjacencyMatrix(graph, { isWeighted: true });
          const { values, vectors } = eigenDecomposition(matrix);
          const rows = matrix.toRows();

          for (const [index, vector] of vectors.entries()) {
            const image = rows.map((row) => dot(row, vector));

            expect(dot(vector, vector)).toBeCloseTo(1, 6);

            expect(
              image.every(
                (value, position) => Math.abs(value - values[index]! * vector[position]!) < 1e-6,
              ),
            ).toBe(true);

            expect(
              vectors.every(
                (other, rival) => rival === index || Math.abs(dot(vector, other)) < 1e-6,
              ),
            ).toBe(true);
          }
        }),
      );
    });

    it('the Laplacian has as many zero eigenvalues as the graph has components, and none negative', () => {
      fc.assert(
        fc.property(arbSimple, (graph) => {
          const values = laplacianSpectrum(graph);
          const zeros = values.filter((value) => Math.abs(value) < EPSILON).length;

          expect(values.every((value) => value > -EPSILON)).toBe(true);
          expect(zeros).toBe(components(graph));

          expect(algebraicConnectivity(graph) > EPSILON).toBe(
            graph.vertexCount > 1 && components(graph) === 1,
          );
        }),
        BRUTE_FORCE,
      );
    });

    it('renaming vertices does not change the spectra', () => {
      fc.assert(
        fc.property(
          arbUndirected.chain((graph) =>
            arbPermutation(graph.vertexCount).map((order) => [graph, order] as const),
          ),
          ([graph, order]) => {
            const moved = relabel(graph, order);
            const [left, right] = [
              adjacencySpectrum(graph, { isWeighted: true }),
              adjacencySpectrum(moved, { isWeighted: true }),
            ];

            expect(right).toHaveLength(left.length);
            expect(right.every((value, index) => Math.abs(value - left[index]!) < 1e-6)).toBe(true);
          },
        ),
      );
    });
  });
});
