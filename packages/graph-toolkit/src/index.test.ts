import { describe, expect, it } from 'vitest';
import * as toolkit from './index.js';

describe('graph-toolkit facade', () => {
  it('exposes one entry point per domain', () => {
    const names = [
      'GraphBuilder',
      'MinPriorityQueue',
      'adjacencyMatrix',
      'bfs',
      'dijkstra',
      'minimumSpanningForest',
      'dsaturColoring',
      'maxFlow',
      'cycleGraph',
      'canonicalize',
      'diffGraphs',
      'complement',
      'toDot',
      'forceLayout',
    ];

    for (const name of names) {
      expect(toolkit).toHaveProperty(name);
    }
  });
});
