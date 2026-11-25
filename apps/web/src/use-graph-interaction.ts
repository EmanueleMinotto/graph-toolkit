import { type VertexId } from 'graph-toolkit';
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { IDENTITY, panBy, shifted, toContent, wheelFactor, zoomAt } from './viewport.js';
import type { Pt, View } from './viewport.js';

export interface Box {
  readonly width: number;
  readonly height: number;
}

const CLICK_SLOP = 3;
const HIT_RADIUS = 18;

/** Gestures that edit the graph; passing `undefined` leaves the canvas in select mode. */
export interface EditHandlers {
  readonly onAdd: (at: Pt) => void;
  readonly onLink: (from: VertexId, to: VertexId) => void;
}

export interface Link {
  readonly from: VertexId;
  readonly to: Pt;
}

interface Drag {
  readonly target: VertexId | undefined;
  /** Shift was held on pointer down: a click toggles group membership instead of picking. */
  readonly isAdditive: boolean;
  readonly last: Pt;
  readonly travelled: number;
}

export interface Interaction {
  readonly svg: RefObject<SVGSVGElement | null>;
  readonly view: View;
  readonly position: (id: VertexId) => Pt | undefined;
  /** Rubber-band edge while dragging from a vertex in edit mode. */
  readonly link: Link | undefined;
  readonly positions: () => ReadonlyMap<VertexId, Pt>;
  readonly startDrag: (event: PointerEvent, target: VertexId | undefined) => void;
  readonly moveDrag: (event: PointerEvent) => void;
  readonly endDrag: () => void;
  readonly reset: () => void;
}

export interface Options {
  readonly base: ReadonlyMap<VertexId, Pt>;
  readonly box: Box;
  readonly onPick: (id: VertexId) => void;
  /** Vertices that move together when one of them is dragged. */
  readonly group: ReadonlySet<VertexId>;
  readonly onToggle: (id: VertexId) => void;
  readonly edit?: EditHandlers | undefined;
}

/** Wheel zoom, background panning and vertex dragging for an SVG of size `box`. */
export function useGraphInteraction({
  base,
  box,
  onPick,
  group,
  onToggle,
  edit,
}: Options): Interaction {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | undefined>(undefined);
  const [view, setView] = useState<View>(IDENTITY);
  const [moved, setMoved] = useState<ReadonlyMap<VertexId, Pt>>(new Map());
  const [link, setLink] = useState<Link | undefined>();
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
    drag.current = { target, isAdditive: event.shiftKey, last: toSvg(event), travelled: 0 };
  };

  const moveDrag = (event: PointerEvent): void => {
    const current = drag.current;
    if (current === undefined) return;
    const point = toSvg(event);
    const [dx, dy] = [point.x - current.last.x, point.y - current.last.y];
    drag.current = { ...current, last: point, travelled: current.travelled + Math.hypot(dx, dy) };
    const { target } = current;
    if (target !== undefined && edit !== undefined) {
      setLink({ from: target, to: toContent(view, point) });
      return;
    }
    if (target === undefined) {
      setView((previous) => panBy(previous, dx, dy));
      return;
    }
    const movers = (group.has(target) ? [...group] : [target]).map(
      (id) => [id, position(id) ?? point] as const,
    );
    setMoved((previous) => shifted(previous, movers, [dx / view.scale, dy / view.scale]));
  };

  const positions = (): ReadonlyMap<VertexId, Pt> =>
    new Map([...base.keys()].map((id) => [id, position(id) ?? { x: 0, y: 0 }]));

  const vertexAt = (point: Pt): VertexId | undefined =>
    base.keys().find((id) => {
      const at = position(id);
      return at !== undefined && Math.hypot(at.x - point.x, at.y - point.y) <= HIT_RADIUS;
    });

  const finishLink = (source: VertexId, point: Pt): void => {
    const hit = vertexAt(point);
    if (hit !== undefined && hit !== source) edit?.onLink(source, hit);
  };

  const release = ({ target, last, travelled, isAdditive }: Drag): void => {
    const isClick = travelled < CLICK_SLOP;
    const point = toContent(view, last);
    if (target === undefined) {
      if (isClick) edit?.onAdd(point);
    } else if (isClick) {
      (isAdditive ? onToggle : onPick)(target);
    } else {
      finishLink(target, point);
    }
  };

  const endDrag = (): void => {
    const current = drag.current;
    drag.current = undefined;
    setLink(undefined);
    if (current !== undefined) release(current);
  };

  const reset = (): void => {
    setView(IDENTITY);
    setMoved(new Map());
  };

  return { svg, view, position, link, positions, startDrag, moveDrag, endDrag, reset };
}
