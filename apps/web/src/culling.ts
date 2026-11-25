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

export interface Heading {
  readonly dx: number;
  readonly dy: number;
}

/**
 * The vertex closest to `from` in the direction `heading` (a unit axis step): it must lie ahead,
 * and sideways drift counts against it. `undefined` when nothing lies that way.
 */
export function nextInDirection<T extends string>(
  from: Pt,
  heading: Heading,
  candidates: readonly (readonly [T, Pt])[],
): T | undefined {
  const scored = candidates
    .map(([id, point]) => {
      const [along, side] = [
        (point.x - from.x) * heading.dx + (point.y - from.y) * heading.dy,
        Math.abs((point.x - from.x) * heading.dy - (point.y - from.y) * heading.dx),
      ];
      return { id, along, score: along + side };
    })
    .filter((entry) => entry.along > 0);
  return scored.toSorted((left, right) => left.score - right.score)[0]?.id;
}
