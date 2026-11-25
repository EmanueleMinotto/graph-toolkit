import { Accordion, Group, Stack } from '@mantine/core';
import { type Icon } from '@tabler/icons-react';
import { type ReactNode } from 'react';

interface PanelProps {
  /** Key used to remember whether the panel is open. */
  readonly id: string;
  readonly title: string;
  readonly icon: Icon;
  readonly children: ReactNode;
}

/** A collapsible sidebar section; must be rendered inside an `Accordion`. */
export function Panel({ id, title, icon: Glyph, children }: PanelProps) {
  return (
    <Accordion.Item value={id}>
      <Accordion.Control>
        <Group gap="xs" wrap="nowrap">
          <Glyph size={18} stroke={1.5} />
          {title}
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="sm">{children}</Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
