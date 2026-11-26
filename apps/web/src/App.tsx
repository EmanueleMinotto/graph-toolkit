import { AppShell } from '@mantine/core';
import { type Graph, type VertexId } from 'graph-toolkit';
import { useMemo, useRef, useState } from 'react';
import { AnalysisPanel } from './AnalysisPanel.js';
import { OperationsPanel } from './OperationsPanel.js';
import { LayoutPanel } from './LayoutPanel.js';
import { Sidebar } from './Sidebar.js';
import { EditPanel } from './EditPanel.js';
import { GeneratePanel } from './GeneratePanel.js';
import { GraphView, type GraphViewHandle } from './GraphView.js';
import { ExamplesPanel } from './ExamplesPanel.js';
import { ImportPanel } from './ImportPanel.js';
import { Header } from './Header.js';
import { shareUrl } from './persistence.js';
import { initialScene, useShell } from './use-persistence.js';
import { makeSample } from './samples.js';
import { useLayout } from './use-layout.js';
import { type Scene } from './scene.js';
import { ValidationPanel } from './ValidationPanel.js';
import { useGuard } from './use-guard.js';
import { useTool } from './use-tool.js';
import { useAnalysis } from './use-analysis.js';
import { useEditor } from './use-editor.js';
import { useHistory } from './use-history.js';

export function App() {
  const history = useHistory<Scene>(initialScene);
  const scene = history.present;
  const { graph } = scene;

  useShell(graph);
  const { kind, count, setCount, choose } = useTool();
  const [picked, setPicked] = useState<readonly VertexId[]>([]);
  const [other, setOther] = useState(() => makeSample('path', 4));
  const { error, setError, guarded } = useGuard();
  const [generation, setGeneration] = useState(0);
  const view = useRef<GraphViewHandle>(null);

  const { layoutKind, layout, changeLayout } = useLayout(scene, history.push);
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

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 360, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Header
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={() => travel(history.undo)}
          onRedo={() => travel(history.redo)}
          shareLink={() => shareUrl(graph, location)}
        />
      </AppShell.Header>
      <Sidebar
        error={error}
        panels={{
          generate: (
            <GeneratePanel
              onGenerate={(sample, size, options) =>
                replaceGraph(makeSample(sample, size, options))
              }
            />
          ),
          examples: <ExamplesPanel onSelect={replaceGraph} />,
          import: <ImportPanel graph={graph} onReplace={replaceGraph} guarded={guarded} />,
          layout: <LayoutPanel value={layoutKind} onChange={changeLayout} />,
          operations: (
            <OperationsPanel
              graph={graph}
              other={other}
              picked={picked}
              onOther={setOther}
              onResult={replaceGraph}
              guarded={guarded}
            />
          ),
          edit: (
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
          ),
          validate: <ValidationPanel graph={graph} />,
          analysis: (
            <AnalysisPanel
              kind={kind}
              graph={graph}
              from={from}
              to={to}
              result={analysis.result}
              isPending={analysis.isPending}
              playback={analysis.playback}
              count={count}
              onCount={setCount}
              onKind={choose}
            />
          ),
        }}
      />
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
          onRemoveGroup={editor.removeVertices}
          onPick={(id) => {
            setPicked((current) => (current.length >= 2 ? [id] : [...current, id]));
          }}
        />
      </AppShell.Main>
    </AppShell>
  );
}
