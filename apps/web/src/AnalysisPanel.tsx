import { Button, Group, Loader, NumberInput, Text } from '@mantine/core';
import { IconChartInfographic } from '@tabler/icons-react';
import { type Graph, type VertexId } from 'graph-toolkit';
import { type AnalysisKind, type Highlight } from './analysis.js';
import { MatrixGrid, ResultTable } from './ResultViews.js';
import { ChoiceSelect } from './ChoiceSelect.js';
import { toolChoices } from './choices.js';
import { Panel } from './Controls.js';
import { PlaybackBar } from './PlaybackBar.js';
import { toolOf, type Param, type Tool } from './tools.js';
import { type Playback } from './use-playback.js';
import { t } from './i18n.js';

interface AnalysisProps {
  readonly kind: AnalysisKind;
  readonly graph: Graph;
  readonly from: VertexId | undefined;
  readonly to: VertexId | undefined;
  readonly result: Highlight;
  readonly isPending: boolean;
  readonly playback: Playback;
  readonly count: number;
  readonly onCount: (count: number) => void;
  readonly onKind: (kind: AnalysisKind) => void;
}

function selectionHint(tool: Tool, from = '–', to = '–'): string {
  const { needs } = tool;
  if (tool.usesOther === true) return 'Compares with the second graph (Operations panel).';
  if (needs === 0) return '';
  const target = needs === 2 ? ` and target (${to})` : '';
  return `Click vertices to choose start (${from})${target}.`;
}

export function AnalysisPanel(props: AnalysisProps) {
  const active = toolOf(props.kind);
  const hint = selectionHint(active, props.from, props.to);
  return (
    <Panel id="analysis" title={t('Analysis')} icon={IconChartInfographic}>
      <ChoiceSelect
        label={t('Algorithm')}
        value={props.kind}
        choices={toolChoices(props.graph)}
        isSearchable
        onChange={props.onKind}
      />
      {active.param === undefined ? null : (
        <ParamInput param={active.param} value={props.count} onChange={props.onCount} />
      )}
      {hint === '' ? null : (
        <Text size="sm" c="dimmed">
          {t(hint)}
        </Text>
      )}
      {props.playback.total > 0 ? <PlaybackBar playback={props.playback} /> : null}
      {props.isPending ? <Running onCancel={() => props.onKind('none')} /> : null}
      <Output result={props.result} />
    </Panel>
  );
}

function ParamInput(props: {
  readonly param: Param;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  const { param } = props;
  return (
    <NumberInput
      label={t(param.label)}
      value={props.value}
      min={param.min}
      max={param.max}
      step={param.step ?? 1}
      allowDecimal={(param.step ?? 1) < 1}
      decimalScale={2}
      onChange={(value) => props.onChange(Number(value))}
    />
  );
}

function Running({ onCancel }: { readonly onCancel: () => void }) {
  return (
    <Group gap="xs">
      <Loader size="xs" />
      <Text size="sm">{t('Running…')}</Text>
      <Button size="compact-xs" variant="subtle" onClick={onCancel}>
        {t('Cancel')}
      </Button>
    </Group>
  );
}

function Output({ result }: { readonly result: Highlight }) {
  return (
    <>
      <Text component="output" aria-live="polite" size="sm" fw={500}>
        {t(result.summary)}
      </Text>
      {result.table === undefined ? null : <ResultTable rows={result.table} />}
      {result.matrix === undefined ? null : <MatrixGrid matrix={result.matrix} />}
    </>
  );
}
