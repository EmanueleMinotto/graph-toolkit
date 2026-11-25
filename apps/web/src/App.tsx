import { Alert, AppShell, Group, Paper, ScrollArea, Stack, Title } from '@mantine/core';
import { type Graph, type VertexId } from 'graph-toolkit';
import { useMemo, useRef, useState } from 'react';
import { AnalysisPanel } from './AnalysisPanel.js';
import { Select } from './Controls.js';
import { EditPanel } from './EditPanel.js';
import { GeneratePanel } from './GeneratePanel.js';
import { GraphView, type GraphViewHandle } from './GraphView.js';
import { ImportPanel } from './ImportPanel.js';
import { Toolbar } from './Toolbar.js';
import { type AnalysisKind } from './analysis.js';
import { makeSample } from './formats.js';
import { computeLayout, LAYOUTS, type LayoutKind } from './layouts.js';
import { type Scene } from './scene.js';
import { useAnalysis } from './use-analysis.js';
import { useEditor } from './use-editor.js';
import { useHistory } from './use-history.js';

export function App() {
  const history = useHistory<Scene>(() => ({ graph: makeSample('cycle', 6), pinned: undefined }));
  const scene = history.present;
  const { graph } = scene;
  const [layoutKind, setLayoutKind] = useState<LayoutKind>('force');
  const [kind, setKind] = useState<AnalysisKind>('none');
  const [picked, setPicked] = useState<readonly VertexId[]>([]);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);
  const view = useRef<GraphViewHandle>(null);

  const layout = useMemo(
    () => scene.pinned ?? computeLayout(layoutKind, graph),
    [scene, layoutKind, graph],
  );
  const [from, to] = picked;
  const selection = useMemo(() => ({ from, to }), [from, to]);
  const analysis = useAnalysis(kind, graph, selection);

  const travel = (move: () => void): void => {
    move();
    remount();
  };
  const remount = (): void => {
    setGeneration((value) => value + 1);
    setPicked([]);
  };
  const replaceGraph = (next: Graph): void => {
    history.push({ graph: next, pinned: undefined });
    remount();
    setError('');
  };
  const guarded = (action: () => void): void => {
    try {
      action();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Unexpected error');
    }
  };
  const editor = useEditor({
    scene,
    picked,
    view,
    commit: (next) => {
      history.push(next);
      setError('');
    },
    clearPicked: () => {
      setPicked([]);
    },
    guarded,
  });
  const changeLayout = (next: LayoutKind): void => {
    if (scene.pinned !== undefined) history.push({ graph, pinned: undefined });
    setLayoutKind(next);
  };

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 360, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={1} size="h3">
            graph-toolkit
          </Title>
          <Toolbar
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={() => travel(history.undo)}
            onRedo={() => travel(history.redo)}
          />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="md">
            <GeneratePanel
              onGenerate={(sample, size, options) =>
                replaceGraph(makeSample(sample, size, options))
              }
            />
            <ImportPanel graph={graph} onReplace={replaceGraph} guarded={guarded} />
            <Paper withBorder p="md" radius="md">
              <Select label="Layout" value={layoutKind} options={LAYOUTS} onChange={changeLayout} />
            </Paper>
            <EditPanel
              mode={editor.mode}
              from={from}
              to={to}
              weight={editor.weight}
              allowParallel={editor.allowParallel}
              onMode={editor.setMode}
              onWeight={editor.setWeight}
              onParallel={editor.setAllowParallel}
              onRemoveVertex={editor.removeVertex}
              onRemoveEdge={editor.removeEdge}
              onSetWeight={editor.applyWeight}
            />
            <AnalysisPanel
              kind={kind}
              graph={graph}
              from={from}
              to={to}
              result={analysis.result}
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
          ref={view}
          graph={graph}
          layout={layout}
          isPinned={scene.pinned !== undefined}
          edit={editor.handlers}
          highlight={analysis.result}
          selected={picked}
          onPick={(id) => {
            setPicked((current) => (current.length >= 2 ? [id] : [...current, id]));
          }}
        />
      </AppShell.Main>
    </AppShell>
  );
}
