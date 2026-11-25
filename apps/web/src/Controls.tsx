import {
  Button,
  Checkbox,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { type VertexId } from 'graph-toolkit';
import { useState, type ReactNode } from 'react';
import { ANALYSES, type AnalysisKind } from './analysis.js';
import { FORMATS, MAX_SIZE, SAMPLES, type Format, type SampleKind } from './formats.js';

const DEFAULT_SIZE = 6;

interface SelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <NativeSelect
      label={label}
      value={value}
      data={[...options]}
      onChange={(event) => onChange(event.currentTarget.value as T)}
    />
  );
}

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        {children}
      </Stack>
    </Paper>
  );
}

interface GenerateProps {
  readonly onGenerate: (kind: SampleKind, size: number) => void;
}

export function GeneratePanel({ onGenerate }: GenerateProps) {
  const [kind, setKind] = useState<SampleKind>('cycle');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onGenerate(data.get('kind') as SampleKind, Number(data.get('size')));
      }}
    >
      <Panel title="Generate">
        <Group grow align="flex-end">
          <NativeSelect
            label="Kind"
            name="kind"
            data={[...SAMPLES]}
            value={kind}
            onChange={(event) => setKind(event.currentTarget.value as SampleKind)}
          />
          <NumberInput
            label="Size"
            name="size"
            min={1}
            max={MAX_SIZE[kind]}
            defaultValue={DEFAULT_SIZE}
            description={`max ${MAX_SIZE[kind]}`}
          />
        </Group>
        <Button type="submit">Generate</Button>
      </Panel>
    </form>
  );
}

interface ImportProps {
  readonly format: Format;
  readonly text: string;
  readonly isDirected: boolean;
  readonly onFormat: (format: Format) => void;
  readonly onText: (text: string) => void;
  readonly onDirected: (isDirected: boolean) => void;
  readonly onImport: () => void;
  readonly onExport: () => void;
}

export function ImportPanel(props: ImportProps) {
  return (
    <Panel title="Import / export">
      <Select label="Format" value={props.format} options={FORMATS} onChange={props.onFormat} />
      <Checkbox
        label="Directed (edge list / CSV)"
        checked={props.isDirected}
        onChange={(event) => props.onDirected(event.currentTarget.checked)}
      />
      <Textarea
        aria-label="Graph text"
        value={props.text}
        onChange={(event) => props.onText(event.currentTarget.value)}
        rows={8}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      />
      <Group grow>
        <Button onClick={props.onImport}>Import</Button>
        <Button variant="default" onClick={props.onExport}>
          Export current
        </Button>
      </Group>
    </Panel>
  );
}

interface AnalysisProps {
  readonly kind: AnalysisKind;
  readonly vertices: readonly VertexId[];
  readonly from: VertexId | undefined;
  readonly to: VertexId | undefined;
  readonly summary: string;
  readonly onKind: (kind: AnalysisKind) => void;
}

export function AnalysisPanel(props: AnalysisProps) {
  return (
    <Panel title="Analysis">
      <Select label="Algorithm" value={props.kind} options={ANALYSES} onChange={props.onKind} />
      <Text size="sm" c="dimmed">
        Click vertices to choose start ({props.from ?? '–'}) and target ({props.to ?? '–'}).
      </Text>
      <Text component="output" aria-live="polite" size="sm" fw={500}>
        {props.summary}
      </Text>
    </Panel>
  );
}
