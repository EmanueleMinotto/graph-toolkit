import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples.js';

describe('examples', () => {
  it('has unique ids and builds a non-empty graph for each', () => {
    expect(new Set(EXAMPLES.map((example) => example.id)).size).toBe(EXAMPLES.length);
    for (const example of EXAMPLES) {
      expect(`${example.id}:${example.build().vertexCount > 0 ? 'ok' : 'empty'}`).toBe(
        `${example.id}:ok`,
      );
      expect(example.description).not.toBe('');
    }
  });
});
