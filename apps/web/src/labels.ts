import { type VertexId } from 'graph-toolkit';
import { isInView } from './culling.js';
import { toScreen, type Pt, type View } from './viewport.js';

/** Below this zoom labels would overlap into noise, so none are drawn. */
export const LABEL_MIN_SCALE = 1.5;
/** Hard cap: text drawing is the slow part of a frame. */
const MAX_LABELS = 3000;

export interface Label {
  readonly text: string;
  /** Position in canvas (box) units, view transform applied. */
  readonly at: Pt;
}

interface Request {
  readonly vertices: readonly VertexId[];
  readonly position: (id: VertexId) => Pt | undefined;
  readonly view: View;
  readonly box: { readonly width: number; readonly height: number };
}

/** Labels for the vertices on screen, once zoomed in far enough to read them. */
export function visibleLabels({ vertices, position, view, box }: Request): readonly Label[] {
  interface Placed {
    readonly text: VertexId;
    readonly point: Pt;
  }
  const placed = vertices
    .map((id) => ({ text: id, point: position(id) }))
    .filter((entry): entry is Placed => entry.point !== undefined);
  const shown = placed.filter(({ point }) => isInView(point, view, box));
  const labels = shown.map(({ text, point }) => ({ text, at: toScreen(view, point) }));
  return view.scale < LABEL_MIN_SCALE ? [] : labels.slice(0, MAX_LABELS);
}
