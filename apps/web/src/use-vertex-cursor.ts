import { type VertexId } from 'graph-toolkit';
import { useState, type KeyboardEvent } from 'react';
import { nextInDirection, type Heading } from './culling.js';
import { type Pt } from './viewport.js';

const HEADINGS: Readonly<Record<string, Heading>> = {
  ArrowRight: { dx: 1, dy: 0 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowUp: { dx: 0, dy: -1 },
};

export interface CursorOptions {
  readonly isActive: boolean;
  readonly vertices: readonly VertexId[];
  readonly position: (id: VertexId) => Pt | undefined;
  readonly onPick: (id: VertexId) => void;
}

export interface VertexCursor {
  readonly cursor: VertexId | undefined;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Keyboard access to vertices a canvas draws: arrow keys move a cursor to the closest vertex in
 * that direction, Enter or Space picks it, Escape drops it. Only active while `isActive`.
 */
export function useVertexCursor(options: CursorOptions): VertexCursor {
  const { isActive, vertices, position, onPick } = options;
  const [cursor, setCursor] = useState<VertexId | undefined>();
  const move = (heading: Heading): void => {
    const from = cursor === undefined ? undefined : position(cursor);
    if (from === undefined) {
      setCursor(vertices[0]);
      return;
    }
    const others = vertices
      .filter((id) => id !== cursor)
      .flatMap((id) => {
        const point = position(id);
        return point === undefined ? [] : [[id, point] as const];
      });
    setCursor(nextInDirection(from, heading, others) ?? cursor);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isActive) return;
    const heading = HEADINGS[event.key];
    if (heading !== undefined) move(heading);
    else if (event.key === 'Escape') setCursor(undefined);
    else if (cursor !== undefined && ['Enter', ' '].includes(event.key)) onPick(cursor);
    else return;
    event.preventDefault();
  };
  return { cursor: isActive ? cursor : undefined, onKeyDown };
}
