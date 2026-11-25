declare const vertexIdBrand: unique symbol;

/** Opaque vertex identifier; create with {@link vertexId}. */
export type VertexId = string & { readonly [vertexIdBrand]: true };

/** Edge weight. Unweighted graphs use {@link DEFAULT_WEIGHT}. */
export type Weight = number;

export const DEFAULT_WEIGHT: Weight = 1;

/** Brands a string as a {@link VertexId}. */
export const vertexId = (value: string): VertexId => value as VertexId;

/** The part of the standard `AbortSignal` the algorithms use (no DOM or Node typings needed). */
export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly throwIfAborted: () => void;
}

/** Lets callers cancel long-running (exponential-time) algorithms; they throw the abort reason. */
export interface AbortOptions {
  readonly signal?: AbortSignalLike;
}

export interface Edge {
  readonly source: VertexId;
  readonly target: VertexId;
  readonly weight: Weight;
}

/**
 * Compressed sparse row adjacency over dense vertex indices `0..n-1`.
 * Arcs of vertex `v` live in `[offsets[v], offsets[v + 1])`. Treat as read-only.
 */
export interface Csr {
  readonly offsets: Uint32Array;
  readonly targets: Uint32Array;
  readonly weights: Float64Array;
}

/** Immutable graph. Undirected edges are stored as two arcs in {@link Csr}. */
export interface Graph {
  readonly directed: boolean;
  readonly vertexCount: number;
  /** Number of logical edges (an undirected edge counts once). */
  readonly edgeCount: number;
  readonly csr: Csr;
  readonly vertices: () => readonly VertexId[];
  readonly edges: () => readonly Edge[];
  readonly hasVertex: (id: VertexId) => boolean;
  /** O(out-degree). */
  readonly hasEdge: (source: VertexId, target: VertexId) => boolean;
  /** Outgoing edges of `id`. */
  readonly neighbors: (id: VertexId) => readonly Edge[];
  /** Out-degree (loops count once). */
  readonly degree: (id: VertexId) => number;
  readonly indexOf: (id: VertexId) => number;
  readonly vertexAt: (index: number) => VertexId;
}
