import { type Graph, type VertexId } from 'graph-toolkit';
import { useState, type RefObject } from 'react';
import {
  addEdge,
  addVertex,
  nextVertexId,
  removeEdges,
  removeVertex,
  removeVertices,
  setWeight,
} from './edit.js';
import { type Mode } from './EditPanel.js';
import { type GraphViewHandle } from './GraphView.js';
import { type Scene } from './scene.js';
import { type EditHandlers } from './use-graph-interaction.js';
import { type Pt } from './viewport.js';

interface Args {
  readonly scene: Scene;
  readonly picked: readonly VertexId[];
  readonly view: RefObject<GraphViewHandle | null>;
  readonly commit: (scene: Scene) => void;
  readonly clearPicked: () => void;
  readonly guarded: (action: () => void) => void;
}

export interface Editor {
  readonly mode: Mode;
  readonly weight: number;
  readonly allowParallel: boolean;
  readonly setMode: (mode: Mode) => void;
  readonly setWeight: (weight: number) => void;
  readonly setAllowParallel: (allow: boolean) => void;
  /** Canvas gestures, only while in edit mode. */
  readonly handlers: EditHandlers | undefined;
  readonly removeVertex: () => void;
  readonly removeVertices: (ids: ReadonlySet<VertexId>) => void;
  readonly removeEdge: () => void;
  readonly applyWeight: () => void;
}

const DEFAULT_WEIGHT = 1;

/** Manual graph editing: every change becomes a new `Scene` with all vertex positions pinned. */
export function useEditor({ scene, picked, view, commit, clearPicked, guarded }: Args): Editor {
  const [mode, setMode] = useState<Mode>('select');
  const [weight, setWeightValue] = useState(DEFAULT_WEIGHT);
  const [allowParallel, setAllowParallel] = useState(false);
  const [from, to] = picked;

  const change = (graph: Graph, extra?: readonly [VertexId, Pt]): void => {
    const known = new Map([
      ...(view.current?.snapshot() ?? []),
      ...(extra === undefined ? [] : [extra]),
    ]);

    commit({ graph, pinned: new Map([...known].filter(([id]) => graph.hasVertex(id))) });
  };
  const { graph } = scene;

  return {
    mode,
    weight,
    allowParallel,
    setMode,
    setWeight: (value) => {
      setWeightValue(Number.isFinite(value) ? value : DEFAULT_WEIGHT);
    },
    setAllowParallel,
    handlers:
      mode === 'edit'
        ? {
            onAdd: (at) => {
              const id = nextVertexId(graph);

              guarded(() => {
                change(addVertex(graph, id), [id, at]);
              });
            },
            onLink: (source, target) => {
              guarded(() => {
                change(addEdge(graph, { source, target, weight }, allowParallel));
              });
            },
          }
        : undefined,
    removeVertex: () => {
      if (from === undefined) {
        return;
      }

      change(removeVertex(graph, from));
      clearPicked();
    },
    removeVertices: (ids) => {
      change(removeVertices(graph, ids));
      clearPicked();
    },
    removeEdge: () => {
      if (from === undefined || to === undefined) {
        return;
      }

      change(removeEdges(graph, { source: from, target: to }));
    },
    applyWeight: () => {
      if (from === undefined || to === undefined) {
        return;
      }

      change(setWeight(graph, { source: from, target: to }, weight));
    },
  };
}
