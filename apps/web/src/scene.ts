import { type Graph, type Layout } from 'graph-toolkit';

/** A graph plus, after manual edits, the exact vertex positions (in canvas coordinates). */
export interface Scene {
  readonly graph: Graph;
  readonly pinned: Layout | undefined;
}
