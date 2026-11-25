import { findGraphIsomorphism, type Graph } from 'graph-toolkit';
import { NONE, type Highlight, type Selection } from './analysis-types.js';

export type CompareKind = 'isomorphism';

function isomorphism(graph: Graph, { other }: Selection): Highlight {
  if (other === undefined) return { ...NONE, summary: 'Generate a second graph first.' };
  const mapping = findGraphIsomorphism(graph, other);
  if (mapping === undefined) return { ...NONE, summary: 'Not isomorphic to the second graph.' };
  return {
    ...NONE,
    summary: 'Isomorphic to the second graph',
    table: [...mapping].map(([from, to]) => [from, to]),
  };
}

export const compareAnalyses: Readonly<
  Record<CompareKind, (graph: Graph, selection: Selection) => Highlight>
> = { isomorphism };
