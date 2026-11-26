import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import {
  applyDiff,
  diffGraphs,
  canRedo,
  canUndo,
  commit,
  createHistory,
  invertDiff,
  isEmptyDiff,
  redo,
  undo,
  type GraphDiff,
} from './index.js';

const [a, b, c, d] = [vertexId('a'), vertexId('b'), vertexId('c'), vertexId('d')] as const;

const before = new GraphBuilder()
  .addVertex(a)
  .addVertex(b)
  .addVertex(c)
  .addEdge(a, b)
  .addEdge(b, c, 2)
  .build();
const after = new GraphBuilder()
  .addVertex(a)
  .addVertex(b)
  .addVertex(d)
  .addEdge(b, a, 5)
  .addEdge(d, a)
  .build();

const byText = (left: string, right: string): number => left.localeCompare(right);

const shape = (graph: Graph) => ({
  vertices: graph.vertices().toSorted(byText),
  edges: graph
    .edges()
    .map(({ source, target, weight }) => `${[source, target].toSorted(byText).join('-')}:${weight}`)
    .toSorted(byText),
});

describe('diffGraphs', () => {
  it('lists added, removed and reweighted parts, treating undirected edges as unordered', () => {
    const diff = diffGraphs(before, after);

    expect(diff.addedVertices).toEqual([d]);
    expect(diff.removedVertices).toEqual([c]);
    expect(diff.addedEdges).toEqual([{ source: a, target: d, weight: 1 }]);
    expect(diff.removedEdges).toEqual([{ source: b, target: c, weight: 2 }]);
    expect(diff.reweightedEdges).toEqual([{ source: a, target: b, before: 1, after: 5 }]);
  });

  it('is empty for equal graphs and rejects mixed directions', () => {
    expect(isEmptyDiff(diffGraphs(before, before))).toBe(true);
    expect(isEmptyDiff(diffGraphs(before, after))).toBe(false);

    expect(() => diffGraphs(before, new GraphBuilder({ directed: true }).build())).toThrow(
      GraphError,
    );
  });

  it('keeps edge direction significant in directed graphs', () => {
    const forward = new GraphBuilder({ directed: true })
      .addVertex(a)
      .addVertex(b)
      .addEdge(a, b)
      .build();
    const backward = new GraphBuilder({ directed: true })
      .addVertex(a)
      .addVertex(b)
      .addEdge(b, a)
      .build();

    expect(diffGraphs(forward, backward).addedEdges).toHaveLength(1);
  });
});

describe('applyDiff and invertDiff', () => {
  it('rebuilds the target graph and undoes itself', () => {
    const diff = diffGraphs(before, after);

    expect(shape(applyDiff(before, diff))).toEqual(shape(after));
    expect(shape(applyDiff(after, invertDiff(diff)))).toEqual(shape(before));
  });

  it('rejects a diff of the other direction', () => {
    const diff: GraphDiff = { ...diffGraphs(before, before), directed: true };

    expect(() => applyDiff(before, diff)).toThrow(GraphError);
  });
});

describe('history', () => {
  it('steps back and forth and is a no-op at both ends', () => {
    const start = createHistory(before);

    expect(canUndo(start)).toBe(false);
    expect(undo(start)).toBe(start);
    expect(redo(start)).toBe(start);

    const next = commit(start, after);

    expect(next.current).toBe(after);
    expect(canUndo(next)).toBe(true);

    const back = undo(next);

    expect(shape(back.current)).toEqual(shape(before));
    expect(canRedo(back)).toBe(true);
    expect(shape(redo(back).current)).toEqual(shape(after));
  });

  it('drops the redo branch on a new commit', () => {
    const back = undo(commit(createHistory(before), after));

    expect(canRedo(commit(back, before))).toBe(false);
  });
});
