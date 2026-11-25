import { cycleGraph, pathGraph, completeGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';
import { applyOperation, OPERATIONS, type OperationKind } from './operations.js';

const id = vertexId;
const run = (kind: OperationKind, extra: Partial<Parameters<typeof applyOperation>[2]> = {}) =>
  applyOperation(kind, cycleGraph(4), { other: pathGraph(3), picked: [], keep: '', ...extra });

describe('graph operations', () => {
  it('combines two graphs', () => {
    expect(run('union').edgeCount).toBe(4);
    expect(run('intersection').edgeCount).toBe(2);
    expect(run('cartesian').vertexCount).toBe(12);
    expect(run('tensor').vertexCount).toBe(12);
  });

  it('transforms one graph', () => {
    expect(run('complement').edgeCount).toBe(2);
    expect(run('line-graph').vertexCount).toBe(4);
    expect(run('transpose').edgeCount).toBe(4);
    expect(run('subgraph', { keep: ' 0, 1 ,2 ' }).edgeCount).toBe(2);
    expect(run('contract', { picked: [id('0'), id('1')] }).vertexCount).toBe(3);
  });

  it('explains missing input', () => {
    expect(() => run('subgraph')).toThrow('vertices to keep');
    expect(() => run('contract', { picked: [id('0')] })).toThrow('Pick the two ends');
    expect(() => run('contract', { picked: [id('0'), id('2')] })).toThrow('No edge');
  });

  it('refuses results that would be too large', () => {
    const big = completeGraph(80);
    const input = { other: big, picked: [], keep: '' };
    expect(() => applyOperation('cartesian', big, input)).toThrow('too large');
    expect(() => applyOperation('tensor', big, input)).toThrow('too large');
    expect(() => applyOperation('line-graph', big, input)).toThrow('too large');
    expect(() => applyOperation('complement', big, input)).toThrow('too large');
    expect(() => applyOperation('complement', completeGraph(50), input)).not.toThrow();
  });

  it('lists every operation once', () => {
    expect(new Set(OPERATIONS.map((operation) => operation.id)).size).toBe(OPERATIONS.length);
  });
});

describe('isomorphism analysis', () => {
  const none = { from: undefined, to: undefined };

  it('maps isomorphic graphs and rejects different ones', () => {
    const same = analyze('isomorphism', cycleGraph(5), { ...none, other: cycleGraph(5) });
    expect(same.summary).toBe('Isomorphic to the second graph');
    expect(same.table).toHaveLength(5);
    expect(
      analyze('isomorphism', cycleGraph(5), { ...none, other: pathGraph(5) }).summary,
    ).toContain('Not');
    expect(analyze('isomorphism', cycleGraph(5), none).summary).toContain('second graph first');
  });
});
