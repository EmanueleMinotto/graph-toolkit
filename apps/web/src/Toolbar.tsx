import { ActionIcon, Group, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';

interface Props {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

/** Header actions: undo, redo and the color scheme toggle. */
export function Toolbar({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <Group gap="xs">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => onUndo()}
      >
        ↶
      </ActionIcon>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => onRedo()}
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
