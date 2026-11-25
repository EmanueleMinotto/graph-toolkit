import { type Graph, type Layout, type VertexId } from 'graph-toolkit';
import { edgeKey, type Highlight } from './analysis.js';
import { fitToBox } from './fit.js';
import { useGraphInteraction } from './use-graph-interaction.js';

const BOX = { width: 800, height: 520, padding: 40 } as const;
const RADIUS = 14;
const PALETTE_SIZE = 8;

function nodeClass(color: number | undefined, isSelected: boolean): string {
  const palette = color === undefined ? '' : ` c${color % PALETTE_SIZE}`;
  return `node${palette}${isSelected ? ' selected' : ''}`;
}

interface Props {
  readonly graph: Graph;
  readonly layout: Layout;
  readonly highlight: Highlight;
  readonly selected: readonly (VertexId | undefined)[];
  readonly onPick: (id: VertexId) => void;
}

/** SVG graph with wheel zoom, background panning and draggable vertices. */
export function GraphView({ graph, layout, highlight, selected, onPick }: Props) {
  const { svg, view, position, startDrag, moveDrag, endDrag, reset } = useGraphInteraction(
    fitToBox(layout, BOX),
    BOX,
    onPick,
  );
  const { x, y, scale } = view;
  return (
    <div className="graph-wrap">
      <button type="button" className="reset" onClick={reset}>
        Reset view
      </button>
      <svg
        ref={svg}
        className="graph"
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
    </div>
  );
}
