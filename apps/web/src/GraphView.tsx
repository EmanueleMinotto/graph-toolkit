import { Paper } from '@mantine/core';
import { type Graph, type Layout, type VertexId } from 'graph-toolkit';
import { useImperativeHandle, type Ref } from 'react';
import { type Highlight } from './analysis.js';
import { ArrowMarker } from './ArrowMarker.js';
import { ExportBar } from './ExportBar.js';
import { fitToBox } from './fit.js';
import { useGroup } from './use-group.js';
import { Edges, Vertices } from './GraphLayers.js';
import { useGraphInteraction, type EditHandlers } from './use-graph-interaction.js';
import { t } from './i18n.js';

export const BOX = { width: 800, height: 520, padding: 40 } as const;

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
          <Edges graph={graph} view={view} position={position} highlight={highlight} />
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
          <Vertices
            graph={graph}
            view={view}
            position={position}
            highlight={highlight}
            selected={selected}
            group={group.members}
            onPick={onPick}
            startDrag={startDrag}
          />
        </g>
      </svg>
    </Paper>
  );
}
