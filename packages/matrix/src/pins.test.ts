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
    expect(buildCases()).toEqual({});
  });
});
