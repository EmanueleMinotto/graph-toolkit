import {
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { type Graph, type ValidationIssue } from 'graph-toolkit';
import { useState } from 'react';
import { IconShieldCheck } from '@tabler/icons-react';
import { Panel } from './Controls.js';
import { DEFAULT_FORM, validate, type ValidationForm } from './validation.js';

type Report = { readonly issues: readonly ValidationIssue[] } | { readonly failure: string };

function Verdict({ report }: { readonly report: Report }) {
  if ('failure' in report) {
    return (
      <Text size="sm" c="red" role="alert">
        {report.failure}
      </Text>
    );
  }
  if (report.issues.length === 0) return <Text size="sm">Valid: no issues found.</Text>;
  return (
    <Stack gap={4}>
      {report.issues.map((issue) => (
        <Text key={issue.message} size="sm">
          <Badge size="xs" mr={6}>
            {issue.code}
          </Badge>
          {issue.message}
        </Text>
      ))}
    </Stack>
  );
}

function Limit(props: {
  readonly label: string;
  readonly value: number | '';
  readonly onChange: (value: number | '') => void;
}) {
  return (
    <NumberInput
      label={props.label}
      value={props.value}
      onChange={(value) => props.onChange(value === '' ? '' : Number(value))}
    />
  );
}

export function ValidationPanel({ graph }: { readonly graph: Graph }) {
  const [form, setForm] = useState<ValidationForm>(DEFAULT_FORM);
  const [report, setReport] = useState<Report | undefined>();
  const set = (patch: Partial<ValidationForm>): void => {
    setForm({ ...form, ...patch });
  };
  const run = (): void => {
    try {
      setReport({ issues: validate(graph, form) });
    } catch (error) {
      setReport({ failure: error instanceof Error ? error.message : 'Invalid schema' });
    }
  };
  return (
    <Panel id="validate" title="Validation" icon={IconShieldCheck}>
      <SegmentedControl
        fullWidth
        value={form.direction}
        data={['any', 'undirected', 'directed']}
        onChange={(value) => set({ direction: value })}
      />
      <Checkbox
        label="Allow self-loops"
        checked={form.allowSelfLoops}
        onChange={(event) => set({ allowSelfLoops: event.currentTarget.checked })}
      />
      <Checkbox
        label="Allow isolated vertices"
        checked={form.allowIsolated}
        onChange={(event) => set({ allowIsolated: event.currentTarget.checked })}
      />
      <Checkbox
        label="Must be connected"
        checked={form.connected}
        onChange={(event) => set({ connected: event.currentTarget.checked })}
      />
      <Group grow>
        <Limit
          label="Max vertices"
          value={form.maxVertices}
          onChange={(value) => set({ maxVertices: value })}
        />
        <Limit
          label="Max edges"
          value={form.maxEdges}
          onChange={(value) => set({ maxEdges: value })}
        />
      </Group>
      <Group grow>
        <Limit
          label="Min weight"
          value={form.minWeight}
          onChange={(value) => set({ minWeight: value })}
        />
        <Limit
          label="Max weight"
          value={form.maxWeight}
          onChange={(value) => set({ maxWeight: value })}
        />
      </Group>
      <Checkbox
        label="Integer weights only"
        checked={form.isInteger}
        onChange={(event) => set({ isInteger: event.currentTarget.checked })}
      />
      <TextInput
        label="Vertex id pattern (regex)"
        value={form.pattern}
        onChange={(event) => set({ pattern: event.currentTarget.value })}
      />
      <Button onClick={run}>Validate</Button>
      {report === undefined ? null : <Verdict report={report} />}
    </Panel>
  );
}
