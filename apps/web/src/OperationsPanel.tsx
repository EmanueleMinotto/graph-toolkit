import { Button, Group, NumberInput, Text, TextInput } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';
import { type Graph, type VertexId } from 'graph-toolkit';
import { useState } from 'react';
import { ChoiceSelect } from './ChoiceSelect.js';
import { OPERATION_CHOICES, SAMPLE_CHOICES } from './choices.js';
import { Panel } from './Controls.js';
import { MAX_SIZE, makeSample, type SampleKind } from './formats.js';
import { applyOperation, OPERATIONS, type OperationKind } from './operations.js';

const DEFAULT_SIZE = 4;

interface Props {
  readonly graph: Graph;
  readonly other: Graph;
  readonly picked: readonly VertexId[];
  readonly onOther: (graph: Graph) => void;
  readonly onResult: (graph: Graph) => void;
  /** Runs an action and reports thrown errors to the user. */
  readonly guarded: (action: () => void) => void;
}

const describe = (graph: Graph): string =>
  `${graph.vertexCount} vertices, ${graph.edgeCount} edges, ${graph.directed ? 'directed' : 'undirected'}`;

export function OperationsPanel({ graph, other, picked, onOther, onResult, guarded }: Props) {
  const [kind, setKind] = useState<SampleKind>('cycle');
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [operation, setOperation] = useState<OperationKind>('union');
  const [text, setText] = useState('');
  const field = OPERATIONS.find((entry) => entry.id === operation)?.field;
  return (
    <Panel id="operations" title="Operations" icon={IconTool}>
      <Group grow align="flex-end">
        <ChoiceSelect
          label="Second graph"
          value={kind}
          choices={SAMPLE_CHOICES}
          onChange={setKind}
        />
        <NumberInput
          label="Vertices"
          min={1}
          max={MAX_SIZE[kind]}
          value={size}
          onChange={(value) => setSize(Number(value))}
        />
      </Group>
      <Button
        variant="default"
        onClick={() =>
          onOther(
            makeSample(kind, size, { directed: graph.directed, seed: 7, probability: undefined }),
          )
        }
      >
        Create second graph
      </Button>
      <Text size="sm" c="dimmed">
        Second graph: {describe(other)}
      </Text>
      <ChoiceSelect
        label="Operation"
        value={operation}
        choices={OPERATION_CHOICES}
        onChange={setOperation}
      />
      {field === undefined ? null : (
        <TextInput
          label={field}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
      )}
      <Button
        onClick={() =>
          guarded(() => onResult(applyOperation(operation, graph, { other, picked, text })))
        }
      >
        Apply
      </Button>
    </Panel>
  );
}
