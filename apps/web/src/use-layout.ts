import { type Layout } from 'graph-toolkit';
import { useMemo, useState } from 'react';
import { computeLayout, type LayoutKind } from './layouts.js';
import { type Scene } from './scene.js';

interface LayoutState {
  readonly layoutKind: LayoutKind;
  readonly layout: Layout;
  /** Switching layout drops any manual positions (as one undoable step). */
  readonly changeLayout: (next: LayoutKind) => void;
}

/** Chosen layout algorithm and the vertex positions to draw for `scene`. */
export function useLayout(scene: Scene, push: (next: Scene) => void): LayoutState {
  const [layoutKind, setLayoutKind] = useState<LayoutKind>('force');
  const layout = useMemo(
    () => scene.pinned ?? computeLayout(layoutKind, scene.graph),
    [scene, layoutKind],
  );
  const changeLayout = (next: LayoutKind): void => {
    if (scene.pinned !== undefined) push({ graph: scene.graph, pinned: undefined });
    setLayoutKind(next);
  };
  return { layoutKind, layout, changeLayout };
}
