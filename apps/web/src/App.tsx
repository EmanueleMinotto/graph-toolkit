import { Alert, AppShell, ScrollArea, Stack } from '@mantine/core';
import { type Graph, type VertexId } from 'graph-toolkit';
import { useMemo, useRef, useState } from 'react';
import { AnalysisPanel } from './AnalysisPanel.js';
import { OperationsPanel } from './OperationsPanel.js';
import { LayoutPanel } from './LayoutPanel.js';
import { PanelStack } from './PanelStack.js';
import { EditPanel } from './EditPanel.js';
import { GeneratePanel } from './GeneratePanel.js';
import { GraphView, type GraphViewHandle } from './GraphView.js';
import { ImportPanel } from './ImportPanel.js';
import { Header } from './Header.js';
import { makeSample } from './formats.js';
import { computeLayout, type LayoutKind } from './layouts.js';
import { type Scene } from './scene.js';
import { ValidationPanel } from './ValidationPanel.js';
import { useGuard } from './use-guard.js';
import { useTool } from './use-tool.js';
import { useAnalysis } from './use-analysis.js';
import { useEditor } from './use-editor.js';
import { useHistory } from './use-history.js';

export function App() {
  const history = useHistory<Scene>(() => ({ graph: makeSample('cycle', 6), pinned: undefined }));
  const scene = history.present;
  const { graph } = scene;
  const [layoutKind, setLayoutKind] = useState<LayoutKind>('force');
  const { kind, count, setCount, choose } = useTool();
  const [picked, setPicked] = useState<readonly VertexId[]>([]);
  const [other, setOther] = useState(() => makeSample('path', 4));
  const { error, setError, guarded } = useGuard();
  const [generation, setGeneration] = useState(0);
  const view = useRef<GraphViewHandle>(null);

  const layout = useMemo(
    () => scene.pinned ?? computeLayout(layoutKind, graph),
    [scene, layoutKind, graph],
  );
  const [from, to] = picked;
  const selection = useMemo(() => ({ from, to, count, other }), [from, to, count, other]);
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
        <Header
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={() => travel(history.undo)}
          onRedo={() => travel(history.redo)}
        />
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="md">
            <PanelStack>
              <GeneratePanel
                onGenerate={(sample, size, options) =>
                  replaceGraph(makeSample(sample, size, options))
                }
              />
              <ImportPanel graph={graph} onReplace={replaceGraph} guarded={guarded} />
              <LayoutPanel value={layoutKind} onChange={changeLayout} />
              <OperationsPanel
                graph={graph}
                other={other}
                picked={picked}
                onOther={setOther}
                onResult={replaceGraph}
                guarded={guarded}
              />
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
              <ValidationPanel graph={graph} />
              <AnalysisPanel
                kind={kind}
                graph={graph}
                from={from}
                to={to}
                result={analysis.result}
                isPending={analysis.isPending}
                count={count}
                onCount={setCount}
                onKind={choose}
              />
            </PanelStack>
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
