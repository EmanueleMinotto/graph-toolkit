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
  it('prints them', () => {
    expect(
      Object.fromEntries(Object.entries(cases).map(([key, graph]) => [key, listed(graph)])),
    ).toEqual({});
  });
});
