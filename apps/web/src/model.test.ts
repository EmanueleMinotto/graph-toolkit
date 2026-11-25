import { cycleGraph, pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze, edgeKey } from './analysis.js';
import { fitToBox } from './fit.js';
import { FORMATS, makeSample, parseGraph, SAMPLES, serializeGraph } from './formats.js';

const [zero, one, two] = [vertexId('0'), vertexId('1'), vertexId('2')] as const;

describe('formats', () => {
  it('round trips every format through the model', () => {
    const graph = cycleGraph(4);
    for (const format of FORMATS) {
      const text = serializeGraph(format, graph);
      expect(parseGraph(format, text, false).edgeCount).toBe(graph.edgeCount);
    }
  });
});

describe('samples', () => {
  it('builds every sample kind', () => {
    for (const kind of SAMPLES) expect(makeSample(kind, 4).vertexCount).toBeGreaterThan(0);
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
