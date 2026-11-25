import { Paper } from '@mantine/core';
import { type Graph, type Layout, type VertexId } from 'graph-toolkit';
import { useImperativeHandle, type Ref } from 'react';
import { edgeKey, type Highlight } from './analysis.js';
import { ArrowMarker } from './ArrowMarker.js';
import { ExportBar } from './ExportBar.js';
import { fitToBox } from './fit.js';
import { useGroup } from './use-group.js';
import { VertexNode } from './VertexNode.js';
import { useGraphInteraction, type EditHandlers } from './use-graph-interaction.js';
import { t } from './i18n.js';

export const BOX = { width: 800, height: 520, padding: 40 } as const;
const RADIUS = 14;
/** Smallest vertex radius, as a fraction of `RADIUS`, when sized by score. */
const MIN_SCALE = 0.6;
const PALETTE_SIZE = 8;
const CROWDED = 300;
const LABEL_ZOOM = 1.5;

const isCrowdedAt = (vertexCount: number, scale: number): boolean =>
  vertexCount > CROWDED && scale < LABEL_ZOOM;

function nodeClass(color: number | undefined, isSelected: boolean, isGrouped: boolean): string {
  const palette = color === undefined ? '' : ` c${color % PALETTE_SIZE}`;
  return `node${palette}${isSelected ? ' selected' : ''}${isGrouped ? ' grouped' : ''}`;
}

export interface GraphViewHandle {
  /** Current position of every vertex (after drags), in canvas coordinates. */
  readonly snapshot: () => Layout;
}

function edgeClass(highlight: Highlight, key: string): string {
  const color = highlight.edgeColors?.get(key);
  if (color !== undefined) return `edge e${color % PALETTE_SIZE}`;
  return highlight.edges.has(key) ? 'edge on' : 'edge';
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
  /** Called with the Shift+click group when Delete is pressed. */
  readonly onRemoveGroup?: ((ids: ReadonlySet<VertexId>) => void) | undefined;
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
  onRemoveGroup,
}: Props) {
  const group = useGroup(onRemoveGroup);
  const { svg, view, position, link, positions, startDrag, moveDrag, endDrag, reset } =
    useGraphInteraction({
      base: isPinned ? layout : fitToBox(layout, BOX),
      box: BOX,
      onPick,
      group: group.members,
      onToggle: group.toggle,
      edit,
    });
  useImperativeHandle(ref, () => ({ snapshot: positions }));
  const { x, y, scale } = view;
  /** Hundreds of text nodes make panning sluggish; labels return once zoomed in. */
  const isCrowded = isCrowdedAt(graph.vertexCount, scale);
  return (
    <Paper withBorder radius="md" className="graph-wrap">
      <ExportBar svg={svg} onReset={reset} />
      <svg
        ref={svg}
        className={edit === undefined ? 'graph' : 'graph editing'}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="group"
        aria-label={t('Graph')}
        onPointerDown={(event) => {
          startDrag(event, undefined);
        }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <ArrowMarker />
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
                className={edgeClass(highlight, key)}
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
            const size = highlight.sizes?.get(id) ?? 1;
            return (
              <VertexNode
                key={id}
                id={id}
                point={point}
                radius={RADIUS * (MIN_SCALE + (1 - MIN_SCALE) * size)}
                className={nodeClass(
                  highlight.colors.get(id),
                  selected.includes(id),
                  group.members.has(id),
                )}
                isPressed={selected.includes(id)}
                isLabelShown={!isCrowded}
                onActivate={() => {
                  onPick(id);
                }}
                onPointerDown={(event) => {
                  startDrag(event, id);
                }}
              />
            );
          })}
        </g>
      </svg>
    </Paper>
  );
}
