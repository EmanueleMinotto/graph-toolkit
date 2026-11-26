import { vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { NONE, type Highlight } from './analysis-types.js';
import { reveal } from './playback.js';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')] as const;

describe('reveal', () => {
  it('returns results without steps unchanged', () => {
    expect(reveal(NONE, 0)).toBe(NONE);
  });

  it('shows only the first vertices discovered', () => {
    const result: Highlight = {
      ...NONE,
      colors: new Map([
        [a, 1],
        [b, 1],
        [c, 1],
      ]),
      steps: [{ vertex: a }, { vertex: b }, { vertex: c }],
    };

    expect([...reveal(result, 2).colors.keys()]).toEqual([a, b]);
    expect(reveal(result, 0).colors.size).toBe(0);
    expect(reveal(result, 3).colors.size).toBe(3);
  });

  it('shows only the first edges chosen and keeps colors when steps are edges only', () => {
    const result: Highlight = {
      ...NONE,
      colors: new Map([[a, 2]]),
      edges: new Set(['e1', 'e2']),
      steps: [{ edge: 'e1' }, { edge: 'e2' }],
    };
    const early = reveal(result, 1);

    expect([...early.edges]).toEqual(['e1']);
    expect(early.colors.size).toBe(1);
  });
});
