import { fromJson } from 'graph-toolkit';
import { analyze, type AnalysisKind, type Selection } from './analysis.js';

export interface WorkerRequest extends Selection {
  readonly kind: AnalysisKind;
  /** Graphs are class instances, so they cross the thread boundary as JSON. */
  readonly json: string;
}

// Dedicated worker: the only sender is the page that created it, so there is no origin to check.
// eslint-disable-next-line sonarjs/post-message
globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { kind, json, from, to } = event.data;
  globalThis.postMessage(analyze(kind, fromJson(json), { from, to }));
});
