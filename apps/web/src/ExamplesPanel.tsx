import { Button, Stack, Text } from '@mantine/core';
import { IconBooks } from '@tabler/icons-react';
import { type Graph } from 'graph-toolkit';
import { Panel } from './Controls.js';
import { EXAMPLES } from './examples.js';
import { t } from './i18n.js';

interface Props {
  readonly onSelect: (graph: Graph) => void;
}

/** Ready-made graphs that show what the tools are for. */
export function ExamplesPanel({ onSelect }: Props) {
  return (
    <Panel id="examples" title={t('Examples')} icon={IconBooks}>
      <Stack gap="xs">
        {EXAMPLES.map((example) => (
          <Button
            key={example.id}
            variant="default"
            justify="flex-start"
            h="auto"
            py={6}
            onClick={() => {
              onSelect(example.build());
            }}
          >
            <Stack gap={0} align="flex-start">
              <Text size="sm" fw={600}>
                {example.label}
              </Text>
              <Text size="xs" c="dimmed" fw={400} ta="left" style={{ whiteSpace: 'normal' }}>
                {example.description}
              </Text>
            </Stack>
          </Button>
        ))}
      </Stack>
    </Panel>
  );
}
