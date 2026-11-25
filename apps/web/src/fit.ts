import { type Layout } from 'graph-toolkit';

export interface Box {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
}

/** Scales a layout to fit `box`, preserving aspect ratio and centering. */
export function fitToBox(layout: Layout, box: Box): Layout {
  const points = [...layout.values()];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const [spanX, spanY] = [Math.max(...xs) - minX, Math.max(...ys) - minY];
  const scale = Math.min(
    (box.width - 2 * box.padding) / (spanX || 1),
    (box.height - 2 * box.padding) / (spanY || 1),
  );
  const offsetX = (box.width - spanX * scale) / 2;
  const offsetY = (box.height - spanY * scale) / 2;
  return new Map(
    [...layout].map(([id, point]) => [
      id,
      { x: offsetX + (point.x - minX) * scale, y: offsetY + (point.y - minY) * scale },
    ]),
  );
}
