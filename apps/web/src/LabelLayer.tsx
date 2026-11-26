/* eslint-disable functional/immutable-data -- a 2D canvas is drawn by setting its size and paint state */
import { useLayoutEffect, useRef } from 'react';
import { type Label } from './labels.js';

interface Props {
  readonly labels: readonly Label[];
  readonly box: { readonly width: number; readonly height: number };
}

const FONT_PX = 12;

/** Draws the vertex labels of a big graph on a transparent 2D canvas above the WebGL one. */
export function LabelLayer({ labels, box }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (element === null || !context) {
      return;
    }
    const ratio = globalThis.devicePixelRatio;
    const pixels = Math.round(element.clientWidth * ratio);
    element.width = pixels;
    element.height = Math.round((pixels * box.height) / box.width);
    const unit = pixels / box.width;
    context.clearRect(0, 0, element.width, element.height);
    context.font = `${FONT_PX * unit}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 2.5 * unit;
    context.lineJoin = 'round';
    context.strokeStyle = 'rgb(0 0 0 / 55%)';
    context.fillStyle = 'white';
    for (const { text, at } of labels) {
      context.strokeText(text, at.x * unit, at.y * unit);
      context.fillText(text, at.x * unit, at.y * unit);
    }
  });
  return (
    <canvas ref={canvas} className="gl-labels" aria-hidden="true" data-labels={labels.length} />
  );
}
