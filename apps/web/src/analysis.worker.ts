import { fromJson } from 'graph-toolkit';
import { analyze, type AnalysisKind, type Selection } from './analysis.js';

export interface WorkerRequest extends Omit<Selection, 'other'> {
  readonly kind: AnalysisKind;
  /** Graphs are class instances, so they cross the thread boundary as JSON. */
  readonly json: string;
  readonly otherJson?: string | undefined;
}

// Dedicated worker: the only sender is the page that created it, so there is no origin to check.
// eslint-disable-next-line sonarjs/post-message
globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { kind, json, otherJson, from, to, count } = event.data;
  const other = otherJson === undefined ? undefined : fromJson(otherJson);
  globalThis.postMessage(analyze(kind, fromJson(json), { from, to, count, other }));
});
