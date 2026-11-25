import { type Pt, type View, toScreen } from './viewport.js';

/** Graphs with more vertices than this only draw what is on screen. */
export const CULL_ABOVE = 300;
const MARGIN = 40;

/** Whether `point` (content coordinates) lands inside a `width` × `height` canvas, give or take a margin. */
export function isInView(
  point: Pt,
  view: View,
  box: { readonly width: number; readonly height: number },
): boolean {
  const { x, y } = toScreen(view, point);
  return x >= -MARGIN && x <= box.width + MARGIN && y >= -MARGIN && y <= box.height + MARGIN;
}

/** SVG path data drawing every segment as its own `M … L …` subpath. */
export const segmentsPath = (segments: readonly (readonly [Pt, Pt])[]): string =>
  segments.map(([from, to]) => `M${from.x} ${from.y}L${to.x} ${to.y}`).join('');
