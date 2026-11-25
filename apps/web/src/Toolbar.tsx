import { ActionIcon, Group, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { type Graph } from 'graph-toolkit';
import { type Timeline } from './use-history.js';

interface Props {
  readonly history: Timeline<Graph>;
  /** Runs an undo/redo and resets the view state that depends on the graph. */
  readonly onTravel: (move: () => void) => void;
}

/** Header actions: undo, redo and the color scheme toggle. */
export function Toolbar({ history, onTravel }: Props) {
  return (
    <Group gap="xs">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Undo"
        disabled={!history.canUndo}
        onClick={() => onTravel(history.undo)}
      >
        ↶
      </ActionIcon>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Redo"
        disabled={!history.canRedo}
        onClick={() => onTravel(history.redo)}
      >
        ↷
      </ActionIcon>
      <SchemeToggle />
    </Group>
  );
}

function SchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(scheme === 'light' ? 'dark' : 'light')}
    >
      {scheme === 'light' ? '☾' : '☀'}
    </ActionIcon>
  );
}
