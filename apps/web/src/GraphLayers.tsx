import { type Graph, type VertexId } from 'graph-toolkit';
import { type PointerEvent } from 'react';
import { edgeKey, type Highlight } from './analysis.js';
import { CULL_ABOVE, isInView, segmentsPath } from './culling.js';
import { VertexNode } from './VertexNode.js';
import { type Pt, type View } from './viewport.js';

const RADIUS = 14;
/** Smallest vertex radius, as a fraction of `RADIUS`, when sized by score. */
const MIN_SCALE = 0.6;
const PALETTE_SIZE = 8;
const LABEL_ZOOM = 1.5;
const BOX = { width: 800, height: 520 } as const;

function nodeClass(color: number | undefined, isSelected: boolean, isGrouped: boolean): string {
  const palette = color === undefined ? '' : ` c${color % PALETTE_SIZE}`;
  return `node${palette}${isSelected ? ' selected' : ''}${isGrouped ? ' grouped' : ''}`;
}

function edgeClass(highlight: Highlight, key: string): string {
  const color = highlight.edgeColors?.get(key);
  if (color !== undefined) return `edge e${color % PALETTE_SIZE}`;
  return highlight.edges.has(key) ? 'edge on' : 'edge';
}

interface Common {
  readonly graph: Graph;
  readonly view: View;
  readonly position: (id: VertexId) => Pt | undefined;
  readonly highlight: Highlight;
}

const isOffScreen = (point: Pt, view: View, isCulled: boolean): boolean =>
  isCulled && !isInView(point, view, BOX);

const isCulling = (graph: Graph): boolean => graph.vertexCount > CULL_ABOVE;
const isPlain = (highlight: Highlight, key: string): boolean =>
  !highlight.edges.has(key) && !highlight.edgeColors?.has(key);

interface Drawn {
  readonly key: string;
  readonly from: Pt;
  readonly to: Pt;
}

/** Edges as lines; on big graphs the plain ones near the screen become a single path. */
export function Edges({ graph, view, position, highlight }: Common) {
  const drawn = graph
    .edges()
    .map((edge) => ({
      key: edgeKey(edge.source, edge.target, graph.directed),
      from: position(edge.source),
      to: position(edge.target),
    }))
    .filter((edge): edge is Drawn => edge.from !== undefined && edge.to !== undefined);
  const culling = isCulling(graph);
  const near = culling
    ? drawn.filter((edge) => isInView(edge.from, view, BOX) || isInView(edge.to, view, BOX))
    : drawn;
  const bulk = culling ? near.filter((edge) => isPlain(highlight, edge.key)) : [];
  const lines = culling ? near.filter((edge) => !isPlain(highlight, edge.key)) : near;
  return (
    <>
      {bulk.length === 0 ? null : (
        <path className="edge bulk" d={segmentsPath(bulk.map((edge) => [edge.from, edge.to]))} />
      )}
      {lines.map(({ key, from, to }) => (
        <line
          key={key}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          className={edgeClass(highlight, key)}
          markerEnd={!culling && graph.directed ? 'url(#arrow)' : undefined}
        />
      ))}
    </>
  );
}

interface VertexProps extends Common {
  readonly selected: readonly (VertexId | undefined)[];
  readonly group: ReadonlySet<VertexId>;
  readonly onPick: (id: VertexId) => void;
  readonly startDrag: (event: PointerEvent, target: VertexId) => void;
}

interface Placed {
  readonly id: VertexId;
  readonly point: Pt;
}

/** Vertices to draw: all of them, or on big graphs only those on screen, selected or grouped. */
function shown(props: VertexProps): readonly Placed[] {
  const { graph, view, position, selected, group } = props;
  const culling = isCulling(graph);
  return graph
    .vertices()
    .map((id) => ({ id, point: position(id) }))
    .filter((vertex): vertex is Placed => vertex.point !== undefined)
    .filter(({ id, point }) => {
      const isKept = group.has(id) || selected.includes(id);
      return !isOffScreen(point, view, culling && !isKept);
    });
}

/** Vertices, with labels once zoomed in on big graphs. */
export function Vertices(props: VertexProps) {
  const { graph, view, highlight, selected, group, onPick, startDrag } = props;
  const isLabelShown = !isCulling(graph) || view.scale >= LABEL_ZOOM;
  return shown(props).map(({ id, point }) => (
    <VertexNode
      key={id}
      id={id}
      point={point}
      radius={RADIUS * (MIN_SCALE + (1 - MIN_SCALE) * (highlight.sizes?.get(id) ?? 1))}
      className={nodeClass(highlight.colors.get(id), selected.includes(id), group.has(id))}
      isPressed={selected.includes(id)}
      isLabelShown={isLabelShown}
      onActivate={() => {
        onPick(id);
      }}
      onPointerDown={(event) => {
        startDrag(event, id);
      }}
    />
  ));
}
