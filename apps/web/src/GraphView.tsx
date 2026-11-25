import { Button, Paper } from '@mantine/core';
import { type Graph, type Layout, type VertexId } from 'graph-toolkit';
import { useImperativeHandle, type Ref } from 'react';
import { edgeKey, type Highlight } from './analysis.js';
import { fitToBox } from './fit.js';
import { useGraphInteraction, type EditHandlers } from './use-graph-interaction.js';

export const BOX = { width: 800, height: 520, padding: 40 } as const;
const RADIUS = 14;
const PALETTE_SIZE = 8;

function nodeClass(color: number | undefined, isSelected: boolean): string {
  const palette = color === undefined ? '' : ` c${color % PALETTE_SIZE}`;
  return `node${palette}${isSelected ? ' selected' : ''}`;
}

export interface GraphViewHandle {
  /** Current position of every vertex (after drags), in canvas coordinates. */
  readonly snapshot: () => Layout;
}

interface Props {
  readonly graph: Graph;
  readonly layout: Layout;
  /** True when `layout` is already in canvas coordinates and must not be re-fitted. */
  readonly isPinned: boolean;
  readonly edit?: EditHandlers | undefined;
  readonly ref?: Ref<GraphViewHandle>;
  readonly highlight: Highlight;
  readonly selected: readonly (VertexId | undefined)[];
  readonly onPick: (id: VertexId) => void;
}

/** SVG graph with wheel zoom, background panning and draggable vertices. */
export function GraphView({
  graph,
  layout,
  isPinned,
  edit,
  ref,
  highlight,
  selected,
  onPick,
}: Props) {
  const { svg, view, position, link, positions, startDrag, moveDrag, endDrag, reset } =
    useGraphInteraction({
      base: isPinned ? layout : fitToBox(layout, BOX),
      box: BOX,
      onPick,
      edit,
    });
  useImperativeHandle(ref, () => ({ snapshot: positions }));
  const { x, y, scale } = view;
  return (
    <Paper withBorder radius="md" className="graph-wrap">
      <Button size="xs" variant="default" className="reset" onClick={reset}>
        Reset view
      </Button>
      <svg
        ref={svg}
        className={edit === undefined ? 'graph' : 'graph editing'}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-label="Graph"
        onPointerDown={(event) => {
          startDrag(event, undefined);
        }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10z" className="arrow" />
          </marker>
        </defs>
        <g data-testid="viewport" transform={`translate(${x} ${y}) scale(${scale})`}>
          {graph.edges().map((edge) => {
            const from = position(edge.source);
            const to = position(edge.target);
            if (from === undefined || to === undefined) return null;
            const key = edgeKey(edge.source, edge.target, graph.directed);
            return (
              <line
                key={key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={highlight.edges.has(key) ? 'edge on' : 'edge'}
                markerEnd={graph.directed ? 'url(#arrow)' : undefined}
              />
            );
          })}
          {link === undefined ? null : (
            <line
              className="edge on"
              x1={position(link.from)?.x}
              y1={position(link.from)?.y}
              x2={link.to.x}
              y2={link.to.y}
              pointerEvents="none"
            />
          )}
          {graph.vertices().map((id) => {
            const point = position(id);
            if (point === undefined) return null;
            return (
              <g
                key={id}
                transform={`translate(${point.x} ${point.y})`}
                onPointerDown={(event) => {
                  startDrag(event, id);
                }}
              >
                <circle
                  r={RADIUS}
                  className={nodeClass(highlight.colors.get(id), selected.includes(id))}
                />
                <text className="label" textAnchor="middle" dy="0.35em">
                  {id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </Paper>
  );
}
