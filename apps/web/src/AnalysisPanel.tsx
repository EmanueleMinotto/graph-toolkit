/* eslint-disable functional/prefer-readonly-type -- Mantine's `data` prop only accepts mutable arrays */
import {
  Button,
  Group,
  Loader,
  NativeSelect,
  NumberInput,
  ScrollArea,
  Table,
  Text,
} from '@mantine/core';
import { type Graph, type VertexId } from 'graph-toolkit';
import { type AnalysisKind, type Highlight } from './analysis.js';
import { Panel } from './Controls.js';
import { toolOf, TOOLS, unavailableReason, type Tool } from './tools.js';

interface AnalysisProps {
  readonly kind: AnalysisKind;
  readonly graph: Graph;
  readonly from: VertexId | undefined;
  readonly to: VertexId | undefined;
  readonly result: Highlight;
  readonly isPending: boolean;
  readonly count: number;
  readonly onCount: (count: number) => void;
  readonly onKind: (kind: AnalysisKind) => void;
}

interface Item {
  readonly value: AnalysisKind;
  readonly label: string;
  readonly disabled: boolean;
}

interface ItemGroup {
  readonly group: string;
  readonly items: Item[];
}

const toolItem = (tool: Tool, graph: Graph): Item => {
  const reason = unavailableReason(tool, graph);
  return {
    value: tool.id,
    label: reason === undefined ? tool.label : `${tool.label} (${reason})`,
    disabled: reason !== undefined,
  };
};

/** Select data: ungrouped tools first, then one optgroup per `Tool.group`. */
function toolOptions(graph: Graph): (Item | ItemGroup)[] {
  const groups = [...new Set(TOOLS.map((tool) => tool.group))];
  return groups.flatMap((group): (Item | ItemGroup)[] => {
    const items = TOOLS.filter((tool) => tool.group === group).map((tool) => toolItem(tool, graph));
    return group === undefined ? items : [{ group, items }];
  });
}

function selectionHint(needs: Tool['needs'], from = '–', to = '–'): string {
  if (needs === 0) return '';
  const target = needs === 2 ? ` and target (${to})` : '';
  return `Click vertices to choose start (${from})${target}.`;
}

export function AnalysisPanel(props: AnalysisProps) {
  const active = toolOf(props.kind);
  const hint = selectionHint(active.needs, props.from, props.to);
  return (
    <Panel title="Analysis">
      <NativeSelect
        label="Algorithm"
        value={props.kind}
        data={toolOptions(props.graph)}
        onChange={(event) => props.onKind(event.currentTarget.value as AnalysisKind)}
      />
      {active.param === undefined ? null : (
        <NumberInput
          label={active.param.label}
          value={props.count}
          min={active.param.min}
          max={active.param.max}
          allowDecimal={false}
          onChange={(value) => props.onCount(Number(value))}
        />
      )}
      {hint === '' ? null : (
        <Text size="sm" c="dimmed">
          {hint}
        </Text>
      )}
      {props.isPending ? (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm">Running…</Text>
          <Button size="compact-xs" variant="subtle" onClick={() => props.onKind('none')}>
            Cancel
          </Button>
        </Group>
      ) : null}
      <Text component="output" aria-live="polite" size="sm" fw={500}>
        {props.result.summary}
      </Text>
      {props.result.table === undefined ? null : <ResultTable rows={props.result.table} />}
    </Panel>
  );
}

function ResultTable({ rows }: { readonly rows: readonly (readonly [string, string])[] }) {
  return (
    <ScrollArea.Autosize mah={200}>
      <Table fz="xs" striped>
        <Table.Tbody>
          {rows.map(([key, value]) => (
            <Table.Tr key={key}>
              <Table.Td>{key}</Table.Td>
              <Table.Td>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}
