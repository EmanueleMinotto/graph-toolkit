export interface View {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const IDENTITY: View = { x: 0, y: 0, scale: 1 };

const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

/** Content point → screen point under `view`. */
export const toScreen = (view: View, point: Pt): Pt => ({
  x: point.x * view.scale + view.x,
  y: point.y * view.scale + view.y,
});

/** Screen point → content point under `view`. */
export const toContent = (view: View, point: Pt): Pt => ({
  x: (point.x - view.x) / view.scale,
  y: (point.y - view.y) / view.scale,
});

/** Zooms by `factor` keeping the content under `anchor` (screen coordinates) fixed. */
export function zoomAt(view: View, factor: number, anchor: Pt): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  const content = toContent(view, anchor);
  return { scale, x: anchor.x - content.x * scale, y: anchor.y - content.y * scale };
}

export const panBy = (view: View, dx: number, dy: number): View => ({
  ...view,
  x: view.x + dx,
  y: view.y + dy,
});

/** Wheel delta → zoom factor (scroll up zooms in). */
export const wheelFactor = (deltaY: number): number => Math.exp(-deltaY * 0.0015);

/** `moved` with each `[key, from]` entry displaced by `delta`. */
export const shifted = <K>(
  moved: ReadonlyMap<K, Pt>,
  entries: readonly (readonly [K, Pt])[],
  [dx, dy]: readonly [number, number],
): ReadonlyMap<K, Pt> =>
  new Map([
    ...moved,
    ...entries.map(([key, from]): readonly [K, Pt] => [key, { x: from.x + dx, y: from.y + dy }]),
  ]);
