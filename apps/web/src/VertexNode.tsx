import { type VertexId } from 'graph-toolkit';
import { type PointerEvent } from 'react';
import { type Pt } from './viewport.js';

interface Props {
  readonly id: VertexId;
  readonly point: Pt;
  readonly radius: number;
  readonly className: string;
  readonly isPressed: boolean;
  readonly isLabelShown: boolean;
  readonly onActivate: () => void;
  readonly onPointerDown: (event: PointerEvent) => void;
}

/** One vertex: a focusable circle with its label. */
export function VertexNode(props: Props) {
  const { id, point, radius, className, isPressed, isLabelShown } = props;

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
      role="button"
      tabIndex={0}
      aria-label={`Vertex ${id}`}
      aria-pressed={isPressed}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        props.onActivate();
      }}
      onPointerDown={props.onPointerDown}
    >
      <circle r={radius} className={className} />
      {isLabelShown ? (
        <text className="label" textAnchor="middle" dy="0.35em">
          {id}
        </text>
      ) : null}
    </g>
  );
}
