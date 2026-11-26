import { useState } from 'react';

const LIMIT = 50;

interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

export interface Timeline<T> {
  readonly present: T;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly push: (next: T) => void;
  readonly undo: () => void;
  readonly redo: () => void;
}

/** Undo/redo over immutable values, keeping at most `LIMIT` past states. */
export function useHistory<T>(initial: () => T): Timeline<T> {
  const [history, setHistory] = useState<History<T>>(() => ({
    past: [],
    present: initial(),
    future: [],
  }));
  const { past, present, future } = history;

  return {
    present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    push: (next) => {
      setHistory({ past: [...past, present].slice(-LIMIT), present: next, future: [] });
    },
    undo: () => {
      const previous = past.at(-1);

      if (previous === undefined) {
        return;
      }

      setHistory({ past: past.slice(0, -1), present: previous, future: [present, ...future] });
    },
    redo: () => {
      const [next, ...rest] = future;

      if (next === undefined) {
        return;
      }

      setHistory({ past: [...past, present], present: next, future: rest });
    },
  };
}
