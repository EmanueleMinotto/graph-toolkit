import { cycleGraph, pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze, edgeKey } from './analysis.js';
import { fitToBox } from './fit.js';
import { fileName, FORMATS, formatFromFileName, parseGraph, serializeGraph } from './formats.js';
import { makeSample, randomSeed, SAMPLES } from './samples.js';

const [zero, one, two] = [vertexId('0'), vertexId('1'), vertexId('2')] as const;

describe('formats', () => {
  it('round trips every format through the model', () => {
    const graph = cycleGraph(4);
    const roundTrippable = FORMATS.filter((entry) => entry !== 'prufer');

    for (const format of roundTrippable) {
      const text = serializeGraph(format, graph);

      expect(parseGraph(format, text, false).edgeCount).toBe(graph.edgeCount);
    }
  });

  it('round trips trees through the Prüfer code and rejects non-trees', () => {
    const star = makeSample('star', 6);
    const code = serializeGraph('prufer', star);

    expect(code).toBe('0 0 0 0');
    const rebuilt = parseGraph('prufer', code, false);

    expect(rebuilt.edgeCount).toBe(5);
    expect(serializeGraph('prufer', rebuilt)).toBe(code);
    expect(parseGraph('prufer', '', false).vertexCount).toBe(2);
    expect(() => serializeGraph('prufer', cycleGraph(4))).toThrow('tree');
    expect(() => parseGraph('prufer', '9', false)).toThrow();
  });
});

describe('samples', () => {
  it('builds every sample kind', () => {
    for (const kind of SAMPLES) {
      expect(makeSample(kind, 4).vertexCount).toBeGreaterThan(0);
    }
  });
});

describe('analyze', () => {
  const path = pathGraph(3);

  it('does nothing for none', () => {
    expect(analyze('none', path, { from: undefined, to: undefined }).summary).toBe('');
  });

  it('finds shortest paths', () => {
    const result = analyze('shortest-path', path, { from: zero, to: two });

    expect(result.summary).toContain('Distance 2');
    expect(result.edges.has(edgeKey(one, zero, false))).toBe(true);
  });

  it('explains missing input and unreachable targets', () => {
    expect(analyze('shortest-path', path, { from: zero, to: undefined }).summary).toContain('Pick');
    expect(analyze('bfs', path, { from: undefined, to: undefined }).summary).toContain('Pick');
    const isolated = makeSample('star', 1);
    const split = analyze('shortest-path', isolated, { from: zero, to: zero });

    expect(split.summary).toContain('Distance 0');
    const directed = pathGraph(2, { directed: true });

    expect(analyze('shortest-path', directed, { from: one, to: zero }).summary).toBe(
      'Unreachable.',
    );
  });

  it('runs bfs, coloring and spanning trees', () => {
    expect(analyze('bfs', path, { from: zero, to: undefined }).colors.size).toBe(3);

    expect(analyze('coloring', cycleGraph(5), { from: zero, to: undefined }).summary).toContain(
      '3 colors',
    );

    expect(analyze('mst', cycleGraph(4), { from: undefined, to: undefined }).edges.size).toBe(3);
  });

  it('turns library errors into messages', () => {
    const directed = pathGraph(3, { directed: true });

    expect(analyze('mst', directed, { from: undefined, to: undefined }).summary).toContain(
      'undirected',
    );

    expect(analyze('bfs', path, { from: vertexId('nope'), to: undefined }).summary).toContain(
      'Unknown',
    );
  });
});

describe('fitToBox', () => {
  it('centers and scales points inside the padding', () => {
    const fitted = fitToBox(
      new Map([
        [zero, { x: 0, y: 0 }],
        [one, { x: 2, y: 1 }],
      ]),
      { width: 100, height: 100, padding: 10 },
    );

    expect(fitted.get(zero)).toEqual({ x: 10, y: 30 });
    expect(fitted.get(one)).toEqual({ x: 90, y: 70 });
  });

  it('handles a single point', () => {
    const fitted = fitToBox(new Map([[zero, { x: 5, y: 5 }]]), {
      width: 10,
      height: 10,
      padding: 0,
    });

    expect(fitted.get(zero)).toEqual({ x: 5, y: 5 });
  });
});

describe('makeSample at scale', () => {
  it('builds large sparse graphs and clamps oversized requests', () => {
    expect(makeSample('random', 1000).vertexCount).toBe(1000);
    expect(makeSample('random', 1000).edgeCount).toBeLessThan(5000);
    expect(makeSample('complete', 10_000).vertexCount).toBe(150);
    expect(makeSample('cycle', 0).vertexCount).toBe(1);
  });
});

describe('generation options and file formats', () => {
  it('builds directed graphs, paths and seeded random graphs', () => {
    const options = { directed: true, seed: 1, probability: undefined };

    expect(makeSample('path', 4, options).directed).toBe(true);
    expect(makeSample('path', 4).directed).toBe(false);
    expect(makeSample('path', 4).edgeCount).toBe(3);
    const dense = makeSample('random', 10, { ...options, probability: 1 });

    expect(dense.edgeCount).toBe(45); // arcs follow the pair order, so no reciprocal arcs
    const again = makeSample('random', 30, options).edges();

    expect(makeSample('random', 30, options).edges()).toEqual(again);
    expect(makeSample('random', 30, { ...options, seed: 2 }).edges()).not.toEqual(again);
  });

  it('round-trips Mermaid and maps file names to formats', () => {
    const graph = makeSample('cycle', 4, { directed: true, seed: 1, probability: undefined });
    const text = serializeGraph('mermaid', graph);

    expect(parseGraph('mermaid', text, false).edgeCount).toBe(4);
    expect(fileName('mermaid')).toBe('graph.mmd');
    expect(formatFromFileName('NOTES.GRAPHML')).toBe('graphml');
    expect(formatFromFileName('image.png')).toBeUndefined();
  });
});

describe('randomSeed', () => {
  it('returns different seeds', () => {
    const seeds = new Set(Array.from({ length: 10 }, () => randomSeed()));

    expect(seeds.size).toBeGreaterThan(1);
  });
});
