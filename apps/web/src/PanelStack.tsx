/* eslint-disable functional/prefer-readonly-type -- Mantine's Accordion, the storage hook and dnd-kit use mutable arrays */
import {
  type ClientRect,
  type CollisionDetection,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Accordion } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { Fragment, type ReactNode } from 'react';

const OPEN_KEY = 'graph-toolkit.open-panels';
const ORDER_KEY = 'graph-toolkit.panel-order';
const DRAG_DISTANCE = 5;

export type PanelId =
  'generate' | 'examples' | 'import' | 'layout' | 'operations' | 'edit' | 'validate' | 'analysis';

/** Default order; also the set of every panel (all start open). */
const PANEL_IDS: PanelId[] = [
  'generate',
  'examples',
  'import',
  'layout',
  'operations',
  'edit',
  'validate',
  'analysis',
];

/** Keeps the saved order, drops unknown ids and appends panels added since it was saved. */
const normalized = (saved: readonly string[]): PanelId[] => {
  const known = saved.filter((id): id is PanelId => PANEL_IDS.some((panel) => panel === id));

  return [...new Set([...known, ...PANEL_IDS])];
};

/**
 * The panel whose top or bottom edge is closest to the dragged panel's. Panels differ a lot in
 * height, so comparing centres or corners (dnd-kit's built-ins) would keep a tall panel from ever
 * swapping with a short neighbour; with edges, a swap happens halfway, whichever panel is taller.
 */
const nearestEdge: CollisionDetection = ({ collisionRect, droppableRects, droppableContainers }) =>
  droppableContainers
    .map((droppableContainer) => ({
      droppableContainer,
      rect: droppableRects.get(droppableContainer.id),
    }))
    .filter(
      (entry): entry is { droppableContainer: typeof entry.droppableContainer; rect: ClientRect } =>
        entry.rect !== undefined,
    )
    .map(({ droppableContainer, rect }) => ({
      id: droppableContainer.id,
      data: {
        droppableContainer,
        value: Math.min(
          Math.abs(rect.top - collisionRect.top),
          Math.abs(rect.bottom - collisionRect.bottom),
        ),
      },
    }))
    .toSorted((left, right) => left.data.value - right.data.value);

interface Props {
  readonly panels: Readonly<Record<PanelId, ReactNode>>;
}

/**
 * Sidebar sections that can be collapsed and reordered by dragging their handle (or with the
 * keyboard: focus the handle, press Space, then the arrow keys). Both the open state and the order
 * survive page reloads (localStorage).
 */
export function PanelStack({ panels }: Props) {
  const [open, setOpen] = useLocalStorage<string[]>({
    key: OPEN_KEY,
    defaultValue: PANEL_IDS,
    getInitialValueInEffect: false,
  });
  const [saved, setSaved] = useLocalStorage<string[]>({
    key: ORDER_KEY,
    defaultValue: PANEL_IDS,
    getInitialValueInEffect: false,
  });
  const order = normalized(saved);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (over === null || active.id === over.id) {
      return;
    }

    const ids: readonly string[] = order;
    const [from, to] = [String(active.id), String(over.id)];

    setSaved(arrayMove(order, ids.indexOf(from), ids.indexOf(to)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={nearestEdge}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <Accordion
          multiple
          variant="separated"
          value={open}
          onChange={setOpen}
          styles={{ label: { fontWeight: 600 } }}
        >
          {order.map((id) => (
            <Fragment key={id}>{panels[id]}</Fragment>
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}
