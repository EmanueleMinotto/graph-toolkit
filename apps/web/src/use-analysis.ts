import { toJson, type Graph } from 'graph-toolkit';
import { useEffect, useMemo, useState } from 'react';
import { analyze, type AnalysisKind, type Highlight, type Selection } from './analysis.js';
import type { WorkerRequest } from './analysis.worker.js';

const IDLE: Highlight = { colors: new Map(), edges: new Set(), summary: '' };

export interface AnalysisState {
  readonly result: Highlight;
  readonly isPending: boolean;
}

interface Job extends Selection {
  readonly kind: AnalysisKind;
  readonly graph: Graph;
}

const hasWorker = typeof Worker !== 'undefined';

/**
 * Runs `kind` off the main thread so heavy algorithms never freeze the UI. Changing the inputs
 * terminates the running worker and shows the previous result as pending. Without `Worker`
 * (jsdom) it runs inline.
 */
export function useAnalysis(kind: AnalysisKind, graph: Graph, selection: Selection): AnalysisState {
  const { from, to, count } = selection;
  const job = useMemo<Job>(
    () => ({ kind, graph, from, to, count }),
    [kind, graph, from, to, count],
  );
  const [done, setDone] = useState<{ readonly job: Job; readonly result: Highlight }>({
    job,
    result: IDLE,
  });

  useEffect(() => {
    if (!hasWorker || job.kind === 'none') return;
    const worker = new Worker(new URL('analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<Highlight>) => {
      setDone({ job, result: event.data });
    });
    const request: WorkerRequest = { kind: job.kind, json: toJson(job.graph), from, to, count };
    worker.postMessage(request);
    return () => {
      worker.terminate();
    };
  }, [job, from, to, count]);

  const inline = useMemo(
    () => (hasWorker || kind === 'none' ? IDLE : analyze(kind, graph, { from, to, count })),
    [kind, graph, from, to, count],
  );
  if (kind === 'none') return { result: IDLE, isPending: false };
  if (!hasWorker) return { result: inline, isPending: false };
  return { result: done.result, isPending: done.job !== job };
}
