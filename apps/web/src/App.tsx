import { circularLayout, forceLayout, gridLayout, type Graph, type VertexId } from 'graph-toolkit';
import { useMemo, useState } from 'react';
import { AnalysisPanel, GeneratePanel, ImportPanel, Select } from './Controls.js';
import { GraphView } from './GraphView.js';
import { analyze, type AnalysisKind } from './analysis.js';
import { makeSample, parseGraph, serializeGraph, type Format } from './formats.js';

type LayoutKind = 'force' | 'circular' | 'grid';

const LAYOUTS: readonly LayoutKind[] = ['force', 'circular', 'grid'];

const layouts = {
  force: (graph: Graph) => forceLayout(graph),
  circular: (graph: Graph) => circularLayout(graph),
  grid: (graph: Graph) => gridLayout(graph),
} as const;

export function App() {
  const [graph, setGraph] = useState(() => makeSample('cycle', 6));
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
  const highlight = useMemo(() => analyze(kind, graph, { from, to }), [kind, graph, from, to]);

  const replaceGraph = (next: Graph): void => {
    setGraph(next);
    setGeneration((value) => value + 1);
    setPicked([]);
    setError('');
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
    <main>
      <h1>graph-toolkit</h1>
      <div className="layout">
        <aside>
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
          <Select label="Layout" value={layoutKind} options={LAYOUTS} onChange={setLayoutKind} />
          <AnalysisPanel
            kind={kind}
            vertices={graph.vertices()}
            from={from}
            to={to}
            summary={highlight.summary}
            onKind={setKind}
          />
          {error === '' ? null : <p role="alert">{error}</p>}
        </aside>
        <GraphView
          key={`${layoutKind}-${generation}`}
          graph={graph}
          layout={layout}
          highlight={highlight}
          selected={picked}
          onPick={pick}
        />
      </div>
    </main>
  );
}
