import { Group, Title } from '@mantine/core';
import { Toolbar } from './Toolbar.js';

type ToolbarProps = Parameters<typeof Toolbar>[0];

export function Header(props: ToolbarProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Title order={1} size="h3">
        graph-toolkit
      </Title>
      <Toolbar {...props} />
    </Group>
  );
}
