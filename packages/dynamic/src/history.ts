import type { Graph } from '@graph-sdk/core';
import { applyDiff, diffGraphs, invertDiff, type GraphDiff } from './diff.js';

/**
 * Immutable undo/redo state over successive versions of a graph. Stores one diff per step, not one
 * graph. Build it with {@link createHistory}; every function returns a new history.
 */
export interface GraphHistory {
  readonly current: Graph;
  /** Diffs that led to `current`, oldest first. */
  readonly undoable: readonly GraphDiff[];
  /** Undone diffs, the next one to redo last. */
  readonly redoable: readonly GraphDiff[];
}

export const createHistory = (initial: Graph): GraphHistory => ({
  current: initial,
  undoable: [],
  redoable: [],
});

export const canUndo = (history: GraphHistory): boolean => history.undoable.length > 0;

export const canRedo = (history: GraphHistory): boolean => history.redoable.length > 0;

/** Records `next` as the current graph and drops the redo branch. Throws if its direction differs. */
export const commit = (history: GraphHistory, next: Graph): GraphHistory => ({
  current: next,
  undoable: [...history.undoable, diffGraphs(history.current, next)],
  redoable: [],
});

/** Steps back one commit; returns `history` itself at the start. */
export function undo(history: GraphHistory): GraphHistory {
  const diff = history.undoable.at(-1);

  return diff === undefined
    ? history
    : {
        current: applyDiff(history.current, invertDiff(diff)),
        undoable: history.undoable.slice(0, -1),
        redoable: [...history.redoable, diff],
      };
}

/** Re-applies the last undone commit; returns `history` itself at the end. */
export function redo(history: GraphHistory): GraphHistory {
  const diff = history.redoable.at(-1);

  return diff === undefined
    ? history
    : {
        current: applyDiff(history.current, diff),
        undoable: [...history.undoable, diff],
        redoable: history.redoable.slice(0, -1),
      };
}
