import { Alert, AppShell, Group, Paper, ScrollArea, Stack, Title } from '@mantine/core';
import { circularLayout, forceLayout, gridLayout, type Graph, type VertexId } from 'graph-toolkit';
import { useMemo, useState } from 'react';
import { Toolbar } from './Toolbar.js';
import { AnalysisPanel } from './AnalysisPanel.js';
import { GeneratePanel, ImportPanel, Select } from './Controls.js';
import { GraphView } from './GraphView.js';
import { type AnalysisKind } from './analysis.js';
import { useAnalysis } from './use-analysis.js';
import { useHistory } from './use-history.js';
import { makeSample, parseGraph, serializeGraph, type Format } from './formats.js';

type LayoutKind = 'force' | 'circular' | 'grid';

const LAYOUTS: readonly LayoutKind[] = ['force', 'circular', 'grid'];

const FULL_QUALITY_VERTICES = 200;
const FULL_ITERATIONS = 300;
const MIN_ITERATIONS = 30;

/** Force layout is O(V²) per iteration: scale iterations down so large graphs stay interactive. */
const forceIterations = (vertexCount: number): number =>
  Math.max(
    MIN_ITERATIONS,
    Math.floor(FULL_ITERATIONS * Math.min(1, (FULL_QUALITY_VERTICES / vertexCount) ** 2)),
  );

const layouts = {
  force: (graph: Graph) => forceLayout(graph, { iterations: forceIterations(graph.vertexCount) }),
  circular: (graph: Graph) => circularLayout(graph),
  grid: (graph: Graph) => gridLayout(graph),
} as const;

export function App() {
  const history = useHistory(() => makeSample('cycle', 6));
  const graph = history.present;
  const [format, setFormat] = useState<Format>('json');
  const [text, setText] = useState('');
  const [isDirected, setDirected] = useState(false);
  const [layoutKind, setLayoutKind] = useState<LayoutKind>('force');
  const [kind, setKind] = useState<AnalysisKind>('none');
  const [picked, setPicked] = useState<readonly VertexId[]>([]);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);

  const layout = useMemo(() => layouts[layoutKind](graph), [graph, layoutKind]);
  const [from, to] = picked;
  const selection = useMemo(() => ({ from, to }), [from, to]);
  const analysis = useAnalysis(kind, graph, selection);
  const highlight = analysis.result;

  const replaceGraph = (next: Graph): void => {
    history.push(next);
    setGeneration((value) => value + 1);
    setPicked([]);
    setError('');
  };
  const travel = (move: () => void): void => {
    move();
    setGeneration((value) => value + 1);
    setPicked([]);
  };
  const guarded = (action: () => void): void => {
    try {
      action();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unexpected error');
    }
  };
  const pick = (id: VertexId): void => {
    setPicked((current) => (current.length >= 2 ? [id] : [...current, id]));
  };

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 360, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={1} size="h3">
            graph-toolkit
          </Title>
          <Toolbar history={history} onTravel={travel} />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="md">
            <GeneratePanel onGenerate={(sample, size) => replaceGraph(makeSample(sample, size))} />
            <ImportPanel
              format={format}
              text={text}
              isDirected={isDirected}
              onFormat={setFormat}
              onText={setText}
              onDirected={setDirected}
              onImport={() => guarded(() => replaceGraph(parseGraph(format, text, isDirected)))}
              onExport={() => guarded(() => setText(serializeGraph(format, graph)))}
            />
            <Paper withBorder p="md" radius="md">
              <Select
                label="Layout"
                value={layoutKind}
                options={LAYOUTS}
                onChange={setLayoutKind}
              />
            </Paper>
            <AnalysisPanel
              kind={kind}
              graph={graph}
              from={from}
              to={to}
              result={highlight}
              isPending={analysis.isPending}
              onKind={setKind}
            />
            {error === '' ? null : (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <GraphView
          key={`${layoutKind}-${generation}`}
          graph={graph}
          layout={layout}
          highlight={highlight}
          selected={picked}
          onPick={pick}
        />
      </AppShell.Main>
    </AppShell>
  );
}
