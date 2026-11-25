import { type VertexId } from 'graph-toolkit';

export interface Selection {
  readonly from: VertexId | undefined;
  readonly to: VertexId | undefined;
}

export interface Highlight {
  /** Vertex → palette index. */
  readonly colors: ReadonlyMap<VertexId, number>;
  readonly edges: ReadonlySet<string>;
  readonly summary: string;
  /** Optional two-column detail (e.g. vertex → value). */
  readonly table?: readonly (readonly [string, string])[];
}

export function edgeKey(source: VertexId, target: VertexId, isDirected: boolean): string {
  const ordered = isDirected || source <= target ? [source, target] : [target, source];
  return JSON.stringify(ordered);
}

export const NONE: Highlight = { colors: new Map(), edges: new Set(), summary: '' };
