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

describe('mutation-hardening', () => {
  const empty: GraphDiff = {
    directed: false,
    addedVertices: [],
    removedVertices: [],
    addedEdges: [],
    removedEdges: [],
    reweightedEdges: [],
  };
  const edge = { source: a, target: b, weight: 1 };

  it('is non-empty when any two parts of a diff are filled', () => {
    expect(isEmptyDiff(empty)).toBe(true);
    expect(isEmptyDiff({ ...empty, addedVertices: [a], removedVertices: [b] })).toBe(false);
    expect(isEmptyDiff({ ...empty, removedVertices: [a], addedEdges: [edge] })).toBe(false);
    expect(isEmptyDiff({ ...empty, addedEdges: [edge], removedEdges: [edge] })).toBe(false);

    expect(
      isEmptyDiff({
        ...empty,
        removedEdges: [edge],
        reweightedEdges: [{ source: a, target: b, before: 1, after: 2 }],
      }),
    ).toBe(false);
  });

  it('matches undirected edges whatever their orientation or id order', () => {
    const [x, y, z] = [vertexId('10'), vertexId('9'), vertexId('b')] as const;
    const build = (flip: boolean) => {
      const builder = new GraphBuilder().addVertex(x).addVertex(y).addVertex(z);

      return (
        flip
          ? builder.addEdge(y, x).addEdge(z, y).addEdge(z, x)
          : builder.addEdge(x, y).addEdge(y, z).addEdge(x, z)
      ).build();
    };

    expect(isEmptyDiff(diffGraphs(build(false), build(true)))).toBe(true);
  });

  it('explains why a direction mismatch is rejected', () => {
    const directed = new GraphBuilder({ directed: true }).build();

    expect(() => diffGraphs(before, directed)).toThrow('Cannot diff a directed graph');

    expect(() => applyDiff(before, { ...empty, directed: true })).toThrow(
      'Cannot apply a directed diff',
    );
  });

  it('undoes and redoes the latest of several commits', () => {
    const third = new GraphBuilder().addVertex(a).build();
    const full = commit(commit(createHistory(before), after), third);
    const back = undo(full);

    expect(shape(back.current)).toEqual(shape(after));
    expect(back.undoable).toHaveLength(1);
    expect(back.redoable).toHaveLength(1);

    const back2 = undo(back);

    expect(shape(back2.current)).toEqual(shape(before));
    expect(shape(redo(back2).current)).toEqual(shape(after));
    expect(shape(redo(redo(back2)).current)).toEqual(shape(third));
    expect(redo(redo(back2)).redoable).toEqual([]);
  });

  it('keeps every earlier diff on undo and the undo stack after a redo', () => {
    const second = new GraphBuilder().addVertex(a).build();
    const third = new GraphBuilder().addVertex(b).build();
    const full = commit(commit(commit(createHistory(before), after), second), third);
    const back = undo(full);

    expect(back.undoable).toEqual(full.undoable.slice(0, 2));
    expect(redo(back).undoable).toEqual(full.undoable);
    expect(canUndo(redo(undo(commit(createHistory(before), after))))).toBe(true);
  });
});
