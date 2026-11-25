import { type Graph } from 'graph-toolkit';
import { useEffect } from 'react';
import { useLang } from './i18n.js';
import { loadGraph, saveGraph } from './persistence.js';
import { makeSample } from './samples.js';
import { type Scene } from './scene.js';

/** Keeps the last graph in localStorage and in the address bar so reloads and links restore it. */
export function usePersistence(graph: Graph): void {
  useEffect(() => {
    saveGraph(graph, localStorage, globalThis.history);
  }, [graph]);
}

/** The graph from the link or the last visit, else a small cycle. */
export const initialScene = (): Scene => ({
  graph: loadGraph(location.hash, localStorage) ?? makeSample('cycle', 6),
  pinned: undefined,
});

/** App-wide subscriptions: saving the graph, and re-rendering everything on a language change. */
export function useShell(graph: Graph): void {
  useLang();
  usePersistence(graph);
}
