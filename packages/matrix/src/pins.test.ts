import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  adjacencyMatrix,
  adjacencySpectrum,
  algebraicConnectivity,
  eigenDecomposition,
  incidenceMatrix,
  laplacianMatrix,
  laplacianSpectrum,
} from './index.js';

const r = (value: number): number => Math.round(value * 1e5) / 1e5 + 0;
const rows = (matrix: { toRows: () => readonly (readonly number[])[] }) =>
  matrix.toRows().map((row) => row.map((value) => r(value)));

const buildCases = () => {
  const graph = randomGraph(8, { probability: 0.4, seed: 71 });
  const directed = randomGraph(6, { probability: 0.4, seed: 72 });
  const { values, vectors } = eigenDecomposition(laplacianMatrix(graph));

  return {
    adjacency: rows(adjacencyMatrix(graph)),
    laplacian: rows(laplacianMatrix(graph)),
    incidence: rows(incidenceMatrix(graph)),
    incidenceDirected: rows(incidenceMatrix(randomGraph(6, { probability: 0.4, seed: 72 }))),
    adjacencySpectrum: adjacencySpectrum(graph).map((value) => r(value)),
    laplacianSpectrum: laplacianSpectrum(graph).map((value) => r(value)),
    connectivity: [r(algebraicConnectivity(graph)), r(algebraicConnectivity(directed))],
    eigenvalues: values.map((value) => r(value)),
    eigenvectors: vectors.map((vector) => vector.map((value) => Math.abs(r(value)))),
    power: rows(adjacencyMatrix(graph).power(3)),
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the matrix kernels', () => {
    expect(buildCases()).toEqual({
      adjacency: [
        [0, 0, 0, 1, 0, 1, 1, 0],
        [0, 0, 1, 0, 0, 1, 1, 0],
        [0, 1, 0, 1, 1, 1, 0, 0],
        [1, 0, 1, 0, 0, 0, 1, 1],
        [0, 0, 1, 0, 0, 0, 0, 0],
        [1, 1, 1, 0, 0, 0, 0, 0],
        [1, 1, 0, 1, 0, 0, 0, 1],
        [0, 0, 0, 1, 0, 0, 1, 0],
      ],
      adjacencySpectrum: [
        -2.25945, -2.09854, -0.80145, -0.47568, 0.17556, 0.61392, 1.56418, 3.28147,
      ],
      connectivity: [0.77842, 0.48586],
      eigenvalues: [0, 0.77842, 1.56299, 2.69934, 3.58044, 4, 5.45869, 5.92012],
      eigenvectors: [
        [0.35355, 0.35355, 0.35355, 0.35355, 0.35355, 0.35355, 0.35355, 0.35355],
        [0.20113, 0.03305, 0.1867, 0.1867, 0.8426, 0.02137, 0.23876, 0.34829],
        [0.15479, 0.39367, 0.17164, 0.17164, 0.30487, 0.50111, 0.10704, 0.63768],
        [0.72205, 0.53604, 0.18913, 0.18913, 0.1113, 0.01038, 0.03834, 0.32527],
        [0.04722, 0.43009, 0.11112, 0.11112, 0.04306, 0.63089, 0.49236, 0.38184],
        [0.20412, 0.20412, 0.61237, 0.61237, 0.20412, 0.20412, 0.20412, 0.20412],
        [0.47316, 0.36352, 0.13479, 0.13479, 0.03023, 0.39512, 0.63346, 0.22212],
        [0.14646, 0.26981, 0.60778, 0.60778, 0.12353, 0.16589, 0.346, 0.06678],
      ],
      incidence: [
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      ],
      incidenceDirected: [
        [1, 1, 1, 0, 0, 0, 0, 0],
        [1, 0, 0, 1, 1, 0, 0, 0],
        [0, 1, 0, 1, 0, 1, 0, 0],
        [0, 0, 1, 0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
      ],
      laplacian: [
        [3, 0, 0, -1, 0, -1, -1, 0],
        [0, 3, -1, 0, 0, -1, -1, 0],
        [0, -1, 4, -1, -1, -1, 0, 0],
        [-1, 0, -1, 4, 0, 0, -1, -1],
        [0, 0, -1, 0, 1, 0, 0, 0],
        [-1, -1, -1, 0, 0, 3, 0, 0],
        [-1, -1, 0, -1, 0, 0, 4, -1],
        [0, 0, 0, -1, 0, 0, -1, 2],
      ],
      laplacianSpectrum: [0, 0.77842, 1.56299, 2.69934, 3.58044, 4, 5.45869, 5.92012],
      power: [
        [2, 3, 3, 8, 2, 7, 8, 2],
        [3, 2, 7, 4, 1, 6, 8, 2],
        [3, 7, 2, 9, 4, 7, 4, 2],
        [8, 4, 9, 4, 0, 3, 8, 6],
        [2, 1, 4, 0, 0, 1, 2, 1],
        [7, 6, 7, 3, 1, 2, 3, 4],
        [8, 8, 4, 8, 2, 3, 4, 6],
        [2, 2, 2, 6, 1, 4, 6, 2],
      ],
    });
  });
});
