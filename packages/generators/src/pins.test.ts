import { describe, expect, it } from 'vitest';
import {
  barabasiAlbertGraph,
  randomGraph,
  randomGraphWithEdges,
  wattsStrogatzGraph,
} from './index.js';

const cases = {
  gnp: randomGraph(12, { probability: 0.3, seed: 5 }),
  gnm: randomGraphWithEdges(10, { edges: 12, seed: 6 }),
  ba: barabasiAlbertGraph(14, { attach: 2, seed: 7 }),
  ws: wattsStrogatzGraph(12, { neighbors: 4, beta: 0.4, seed: 8 }),
};

const listed = (graph: (typeof cases)[keyof typeof cases]): string[] =>
  graph.edges().map((edge) => `${edge.source}-${edge.target}`);

describe('pinned edge lists', () => {
  it('keeps the seeded edge lists', () => {
    expect(
      Object.fromEntries(Object.entries(cases).map(([key, graph]) => [key, listed(graph)])),
    ).toEqual({
      ba: [
        '0-1',
        '0-2',
        '0-3',
        '0-4',
        '0-5',
        '0-7',
        '0-12',
        '1-2',
        '1-6',
        '1-8',
        '2-3',
        '2-4',
        '2-5',
        '2-7',
        '2-9',
        '2-10',
        '2-13',
        '3-6',
        '3-10',
        '3-11',
        '4-11',
        '4-13',
        '5-9',
        '6-8',
        '11-12',
      ],
      gnm: ['0-5', '1-2', '1-4', '1-5', '3-9', '3-6', '3-5', '4-6', '4-5', '5-8', '6-9', '7-8'],
      gnp: [
        '0-3',
        '0-11',
        '1-6',
        '1-7',
        '1-8',
        '1-10',
        '1-11',
        '2-4',
        '2-5',
        '2-8',
        '3-4',
        '3-5',
        '3-9',
        '3-10',
        '5-6',
        '5-11',
        '7-8',
        '7-9',
        '8-9',
        '9-11',
        '10-11',
      ],
      ws: [
        '0-1',
        '0-7',
        '0-10',
        '1-2',
        '1-3',
        '1-5',
        '2-3',
        '2-6',
        '2-4',
        '3-6',
        '3-5',
        '3-11',
        '4-6',
        '5-7',
        '6-7',
        '6-9',
        '7-8',
        '7-9',
        '7-11',
        '8-9',
        '8-10',
        '9-10',
        '9-11',
        '10-11',
      ],
    });
  });
});
