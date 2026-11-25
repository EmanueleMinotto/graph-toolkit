import { type VertexId } from 'graph-toolkit';
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { IDENTITY, panBy, wheelFactor, zoomAt, type Pt, type View } from './viewport.js';

export interface Box {
  readonly width: number;
  readonly height: number;
}

const CLICK_SLOP = 3;

interface Drag {
  readonly target: VertexId | undefined;
  readonly last: Pt;
  readonly travelled: number;
}

export interface Interaction {
  readonly svg: RefObject<SVGSVGElement | null>;
  readonly view: View;
  readonly position: (id: VertexId) => Pt | undefined;
  readonly startDrag: (event: PointerEvent, target: VertexId | undefined) => void;
  readonly moveDrag: (event: PointerEvent) => void;
  readonly endDrag: () => void;
  readonly reset: () => void;
}

/** Wheel zoom, background panning and vertex dragging for an SVG of size `box`. */
export function useGraphInteraction(
  base: ReadonlyMap<VertexId, Pt>,
  box: Box,
  onPick: (id: VertexId) => void,
): Interaction {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | undefined>(undefined);
  const [view, setView] = useState<View>(IDENTITY);
  const [moved, setMoved] = useState<ReadonlyMap<VertexId, Pt>>(new Map());
  const position = (id: VertexId): Pt | undefined => moved.get(id) ?? base.get(id);

  const toSvg = (event: { readonly clientX: number; readonly clientY: number }): Pt => {
    const rect = svg.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * box.width) / rect.width,
      y: ((event.clientY - rect.top) * box.height) / rect.height,
    };
  };

  useEffect(() => {
    const element = svg.current;
    if (element === null) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const anchor = {
        x: ((event.clientX - rect.left) * box.width) / rect.width,
        y: ((event.clientY - rect.top) * box.height) / rect.height,
      };
      setView((current) => zoomAt(current, wheelFactor(event.deltaY), anchor));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, [box.width, box.height]);

  const startDrag = (event: PointerEvent, target: VertexId | undefined): void => {
    event.stopPropagation();
    svg.current!.setPointerCapture(event.pointerId);
    drag.current = { target, last: toSvg(event), travelled: 0 };
  };

  const moveDrag = (event: PointerEvent): void => {
    const current = drag.current;
    if (current === undefined) return;
    const point = toSvg(event);
    const [dx, dy] = [point.x - current.last.x, point.y - current.last.y];
    drag.current = { ...current, last: point, travelled: current.travelled + Math.hypot(dx, dy) };
    const { target } = current;
    if (target === undefined) {
      setView((previous) => panBy(previous, dx, dy));
      return;
    }
    const from = position(target) ?? point;
    const next = { x: from.x + dx / view.scale, y: from.y + dy / view.scale };
    setMoved((previous) => new Map(previous).set(target, next));
  };

  const endDrag = (): void => {
    const current = drag.current;
    drag.current = undefined;
    if (current?.target !== undefined && current.travelled < CLICK_SLOP) onPick(current.target);
  };

  const reset = (): void => {
    setView(IDENTITY);
    setMoved(new Map());
  };

  return { svg, view, position, startDrag, moveDrag, endDrag, reset };
}
