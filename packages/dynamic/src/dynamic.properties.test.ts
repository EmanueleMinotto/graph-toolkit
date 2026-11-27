import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { arbGraph, arbPermutation, BRUTE_FORCE, relabel } from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyDiff,
  canRedo,
  canUndo,
  commit,
  createHistory,
  diffGraphs,
  invertDiff,
  isEmptyDiff,
  redo,
  undo,
} from './index.js';

const byText = (left: string, right: string): number => left.localeCompare(right);

/** Order-independent description of a graph: vertex set and weighted edge set. */
const canon = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices().toSorted(byText),
  edges: graph
    .edges()
    .map(({ source, target, weight }) => {
      const ends = graph.directed ? [source, target] : [source, target].toSorted(byText);

      return `${ends.join('>')}:${String(weight)}`;
    })
    .toSorted(byText),
});

/** The same graph written backwards: vertices reversed and, when undirected, edge endpoints swapped. */
const mirrored = (graph: Graph): Graph => {
  const builder = new GraphBuilder({ directed: graph.directed });

  for (const id of graph.vertices().toReversed()) {
    builder.addVertex(id);
  }

  for (const { source, target, weight } of graph.edges().toReversed()) {
    const [from, to] = graph.directed ? [source, target] : [target, source];

    builder.addEdge(from, to, weight);
  }

  return builder.build();
};

const arbSimple = (directed: boolean) =>
  arbGraph({ directed, weighted: true, allowSelfLoops: true });

const arbPair = fc
  .boolean()
  .chain((directed) => fc.tuple(arbSimple(directed), arbSimple(directed)));

const arbSequence = fc
  .boolean()
  .chain((directed) => fc.array(arbSimple(directed), { minLength: 1, maxLength: 6 }));

const sizes = (diff: ReturnType<typeof diffGraphs>) => [
  diff.addedVertices.length,
  diff.removedVertices.length,
  diff.addedEdges.length,
  diff.removedEdges.length,
  diff.reweightedEdges.length,
];

describe('dynamic properties', () => {
  it('applying diffGraphs(a, b) to a gives b', () => {
    fc.assert(
      fc.property(arbPair, ([before, after]) => {
        expect(canon(applyDiff(before, diffGraphs(before, after)))).toEqual(canon(after));
      }),
      BRUTE_FORCE,
    );
  });

  it('the inverted diff takes b back to a, and inversion is an involution', () => {
    fc.assert(
      fc.property(arbPair, ([before, after]) => {
        const diff = diffGraphs(before, after);

        expect(canon(applyDiff(after, invertDiff(diff)))).toEqual(canon(before));
        expect(invertDiff(invertDiff(diff))).toEqual(diff);
      }),
      BRUTE_FORCE,
    );
  });

  it('diffing in the other direction lists the same changes, mirrored', () => {
    fc.assert(
      fc.property(arbPair, ([left, right]) => {
        const forward = diffGraphs(left, right);
        const backward = diffGraphs(right, left);

        expect(backward.addedVertices.toSorted(byText)).toEqual(
          forward.removedVertices.toSorted(byText),
        );

        expect(sizes(backward)).toEqual([
          forward.removedVertices.length,
          forward.addedVertices.length,
          forward.removedEdges.length,
          forward.addedEdges.length,
          forward.reweightedEdges.length,
        ]);
      }),
    );
  });

  it('a diff is empty exactly when the graphs are the same', () => {
    fc.assert(
      fc.property(arbPair, ([before, after]) => {
        expect(isEmptyDiff(diffGraphs(before, after))).toBe(
          JSON.stringify(canon(before)) === JSON.stringify(canon(after)),
        );

        expect(isEmptyDiff(diffGraphs(before, before))).toBe(true);
      }),
    );
  });

  it('renaming the vertices of both graphs does not change the shape of the diff', () => {
    fc.assert(
      fc.property(
        arbPair.chain(([before, after]) =>
          arbPermutation(8).map((order) => [before, after, order] as const),
        ),
        ([before, after, order]) => {
          const renamed = diffGraphs(relabel(before, order), relabel(after, order));

          expect(sizes(renamed)).toEqual(sizes(diffGraphs(before, after)));
        },
      ),
    );
  });

  it('a history undone step by step returns to each earlier graph, and redo returns forward', () => {
    fc.assert(
      fc.property(arbSequence, (graphs) => {
        const [first = graphs[0]!, ...rest] = graphs;
        let history = createHistory(first);

        for (const next of rest) {
          history = commit(history, next);
        }

        const earlierGraphs = graphs.slice(0, -1).toReversed();

        for (const earlier of earlierGraphs) {
          history = undo(history);
          expect(canon(history.current)).toEqual(canon(earlier));
        }

        expect(canUndo(history)).toBe(false);
        expect(canRedo(history)).toBe(rest.length > 0);

        for (const later of graphs.slice(1)) {
          history = redo(history);
          expect(canon(history.current)).toEqual(canon(later));
        }

        expect(canRedo(history)).toBe(false);
        expect(history.undoable).toHaveLength(rest.length);
      }),
    );
  });

  it('committing after an undo drops the redo branch', () => {
    fc.assert(
      fc.property(arbPair, ([first, second]) => {
        const stepped = undo(commit(createHistory(first), second));
        const branched = commit(stepped, second);

        expect(canRedo(stepped)).toBe(true);
        expect(canRedo(branched)).toBe(false);
        expect(canon(branched.current)).toEqual(canon(second));
      }),
    );
  });

  it('does not depend on the order or orientation in which a graph was written', () => {
    fc.assert(
      fc.property(arbPair, ([before, after]) => {
        expect(isEmptyDiff(diffGraphs(before, mirrored(before)))).toBe(true);

        expect(sizes(diffGraphs(before, mirrored(after)))).toEqual(
          sizes(diffGraphs(before, after)),
        );

        expect(canon(applyDiff(before, diffGraphs(before, mirrored(after))))).toEqual(canon(after));
      }),
      BRUTE_FORCE,
    );
  });
});
