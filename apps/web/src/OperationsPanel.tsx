import { Button, Group, NativeSelect, NumberInput, Text, TextInput } from '@mantine/core';
import { type Graph, type VertexId } from 'graph-toolkit';
import { useState } from 'react';
import { Panel } from './Controls.js';
import { MAX_SIZE, SAMPLES, makeSample, type SampleKind } from './formats.js';
import { applyOperation, OPERATIONS, type OperationKind } from './operations.js';

const DEFAULT_SIZE = 4;

const groups = ['Two graphs', 'One graph', 'Normalize'].map((group) => ({
  group,
  items: OPERATIONS.filter((operation) => operation.group === group).map((operation) => ({
    value: operation.id,
    label: operation.label,
  })),
}));

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
    <Panel title="Operations">
      <Group grow align="flex-end">
        <NativeSelect
          label="Second graph"
          data={[...SAMPLES]}
          value={kind}
          onChange={(event) => setKind(event.currentTarget.value as SampleKind)}
        />
        <NumberInput
          label="Vertices in second graph"
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
      <NativeSelect
        label="Operation"
        data={groups}
        value={operation}
        onChange={(event) => setOperation(event.currentTarget.value as OperationKind)}
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
