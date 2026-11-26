import { VisuallyHidden } from '@mantine/core';
import { type VertexId } from 'graph-toolkit';
import { type KeyboardEvent } from 'react';
import { type RenderMode } from './GraphLayers.js';
import { t } from './i18n.js';
import { buildScene, type SceneInput } from './webgl-scene.js';
import { LabelLayer } from './LabelLayer.js';
import { visibleLabels } from './labels.js';
import { WebglLayer } from './WebglLayer.js';
import { type View } from './viewport.js';

interface OverlayProps {
  readonly mode: RenderMode;
  readonly scene: SceneInput;
  readonly view: View;
  readonly box: { readonly width: number; readonly height: number };
}

/** The WebGL canvas behind the SVG, when the graph is big enough to need it. */
export function GlOverlay({ mode, scene, view, box }: OverlayProps) {
  if (mode !== 'webgl') {
    return null;
  }

  const labels = visibleLabels({
    vertices: scene.graph.vertices(),
    position: scene.position,
    view,
    box,
  });

  return (
    <>
      <WebglLayer scene={buildScene(scene)} view={view} box={box} />
      <LabelLayer labels={labels} box={box} />
    </>
  );
}

/** The SVG becomes a tab stop with arrow-key navigation only when a canvas draws the vertices. */
export const keyProps = (
  mode: RenderMode,
  onKeyDown: (event: KeyboardEvent) => void,
): { readonly tabIndex?: number; readonly onKeyDown: (event: KeyboardEvent) => void } =>
  mode === 'webgl' ? { tabIndex: 0, onKeyDown } : { onKeyDown };

/** Tells screen readers which vertex the keyboard cursor is on. */
export function CursorAnnouncer({ cursor }: { readonly cursor: VertexId | undefined }) {
  return (
    <VisuallyHidden aria-live="polite">
      {cursor === undefined ? '' : `${t('Vertex')} ${cursor}`}
    </VisuallyHidden>
  );
}
