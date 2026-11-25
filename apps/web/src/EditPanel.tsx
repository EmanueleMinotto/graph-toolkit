import { Button, Checkbox, Group, NumberInput, SegmentedControl, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { Panel } from './Controls.js';
import { t } from './i18n.js';

export type Mode = 'select' | 'edit';

interface Props {
  readonly mode: Mode;
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly weight: number;
  readonly allowParallel: boolean;
  readonly onMode: (mode: Mode) => void;
  readonly onWeight: (weight: number) => void;
  readonly onParallel: (allow: boolean) => void;
  readonly onRemoveVertex: () => void;
  readonly onRemoveEdge: () => void;
  readonly onSetWeight: () => void;
}

export function EditPanel(props: Props) {
  const hasPair = props.from !== undefined && props.to !== undefined;
  return (
    <Panel id="edit" title={t('Edit graph')} icon={IconPencil}>
      <SegmentedControl
        fullWidth
        value={props.mode}
        data={[
          { value: 'select', label: t('Select') },
          { value: 'edit', label: t('Edit') },
        ]}
        onChange={(value) => props.onMode(value)}
      />
      <Text size="sm" c="dimmed">
        {t(
          props.mode === 'edit'
            ? 'Click the canvas to add a vertex; drag from one vertex to another to add an edge.'
            : 'Switch to edit to change the graph by hand.',
        )}
      </Text>
      <NumberInput
        label={t('Edge weight')}
        value={props.weight}
        onChange={(value) => props.onWeight(Number(value))}
        decimalScale={6}
      />
      <Checkbox
        label={t('Allow parallel edges')}
        checked={props.allowParallel}
        onChange={(event) => props.onParallel(event.currentTarget.checked)}
      />
      <Text size="sm" c="dimmed">
        Selected: {props.from ?? '–'} → {props.to ?? '–'}
      </Text>
      <Group grow>
        <Button
          variant="default"
          disabled={props.from === undefined}
          onClick={props.onRemoveVertex}
        >
          Remove vertex
        </Button>
        <Button variant="default" disabled={!hasPair} onClick={props.onRemoveEdge}>
          Remove edge
        </Button>
      </Group>
      <Button variant="default" disabled={!hasPair} onClick={props.onSetWeight}>
        Set weight on edge
      </Button>
    </Panel>
  );
}
