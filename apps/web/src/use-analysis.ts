import { toJson, type Graph } from 'graph-toolkit';
import { useEffect, useMemo, useState } from 'react';
import { analyze, type AnalysisKind, type Highlight, type Selection } from './analysis.js';
import type { WorkerRequest } from './analysis.worker.js';
import { usePlayback, type Playback } from './use-playback.js';

const IDLE: Highlight = { colors: new Map(), edges: new Set(), summary: '' };

export interface AnalysisState {
  readonly result: Highlight;
  readonly isPending: boolean;
  readonly playback: Playback;
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
  const { result, isPending } = useRawAnalysis(kind, graph, selection);
  const [shown, playback] = usePlayback(result);
  return { result: shown, isPending, playback };
}

interface RawAnalysis {
  readonly result: Highlight;
  readonly isPending: boolean;
}

function useRawAnalysis(kind: AnalysisKind, graph: Graph, selection: Selection): RawAnalysis {
  const { from, to, count, other } = selection;
  const job = useMemo<Job>(
    () => ({ kind, graph, from, to, count, other }),
    [kind, graph, from, to, count, other],
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
    const request: WorkerRequest = {
      kind: job.kind,
      json: toJson(job.graph),
      otherJson: other === undefined ? undefined : toJson(other),
      from,
      to,
      count,
    };
    worker.postMessage(request);
    return () => {
      worker.terminate();
    };
  }, [job, from, to, count, other]);

  const inline = useMemo(
    () => (hasWorker || kind === 'none' ? IDLE : analyze(kind, graph, { from, to, count, other })),
    [kind, graph, from, to, count, other],
  );
  if (kind === 'none') return { result: IDLE, isPending: false };
  if (!hasWorker) return { result: inline, isPending: false };
  return { result: done.result, isPending: done.job !== job };
}
