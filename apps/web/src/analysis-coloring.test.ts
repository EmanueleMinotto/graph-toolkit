import { completeGraph, cycleGraph, pathGraph } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const none = { from: undefined, to: undefined };

describe('coloring analyses', () => {
  it('colors vertices with every algorithm and verifies the result', () => {
    for (const kind of ['coloring', 'greedy-coloring', 'exact-coloring'] as const) {
      const result = analyze(kind, cycleGraph(5), none);

      expect(result.summary).toContain('proper');
      expect(result.summary).not.toContain('NOT');
      expect(result.colors.size).toBe(5);
    }

    expect(analyze('exact-coloring', cycleGraph(5), none).summary).toContain('3 colors');
    expect(analyze('exact-coloring', completeGraph(4), none).summary).toContain('4 colors');
  });

  it('colors edges so that neighbouring edges differ', () => {
    const result = analyze('edge-coloring', pathGraph(4), none);

    expect(result.edgeColors?.size).toBe(3);
    expect(result.summary).toContain('2 edge colors');
    expect(result.table).toHaveLength(3);
    expect(analyze('edge-coloring', cycleGraph(3, { directed: true }), none).summary).not.toBe('');
  });
});
