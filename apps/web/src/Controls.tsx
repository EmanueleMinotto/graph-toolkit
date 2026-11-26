import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Accordion, ActionIcon, Group, Stack } from '@mantine/core';
import { IconGripVertical, type Icon } from '@tabler/icons-react';
import { type ReactNode } from 'react';
import { t } from './i18n.js';

interface PanelProps {
  /** Key used to remember whether the panel is open and where it sits. */
  readonly id: string;
  readonly title: string;
  readonly icon: Icon;
  readonly children: ReactNode;
}

/** A collapsible, sortable sidebar section; must be rendered inside `PanelStack`. */
export function Panel({ id, title, icon: Glyph, children }: PanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <Accordion.Item
      value={id}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.8 : undefined,
      }}
    >
      <Group gap={0} wrap="nowrap" pl="xs">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`${t('Move')} ${title}`}
          style={{ cursor: 'grab', touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={16} stroke={1.5} />
        </ActionIcon>
        <Accordion.Control>
          <Group gap="xs" wrap="nowrap">
            <Glyph size={18} stroke={1.5} />
            {title}
          </Group>
        </Accordion.Control>
      </Group>
      <Accordion.Panel>
        <Stack gap="sm">{children}</Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
