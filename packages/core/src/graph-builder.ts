import { CsrGraph, type GraphAttributes } from './csr-graph.js';
import { DuplicateError, UnknownEdgeError, UnknownVertexError } from './errors.js';
import { buildCsr } from './internal/csr.js';
import {
  dropEdges,
  endpointPairs,
  hasParallelEdges,
  removeAttributes,
  removeIndex,
  shiftDown,
  type EdgeStore,
} from './internal/editing.js';
import {
  DEFAULT_WEIGHT,
  type Attributes,
  type Graph,
  type VertexId,
  type Weight,
} from './types.js';

export interface GraphBuilderOptions {
  readonly directed?: boolean;
  /** Allow several edges between the same endpoints (multigraph). Default false. */
  readonly allowParallelEdges?: boolean;
}

/** Everything an edge can carry besides its endpoints. */
export interface EdgeDetails {
  /** Default 1. */
  readonly weight?: Weight;
  readonly attributes?: Attributes;
}

const detailsOf = (details: Weight | EdgeDetails): EdgeDetails =>
  typeof details === 'number' ? { weight: details } : details;

/** Copies attributes so later changes to the caller's object cannot reach the graph. */
const frozen = (attributes: Attributes): Attributes => Object.freeze({ ...attributes });

/** Mutable accumulator that produces an immutable {@link Graph} via `build()`. */
export class GraphBuilder {
  readonly #directed: boolean;
  readonly #allowParallel: boolean;
  readonly #indices = new Map<VertexId, number>();
  readonly #vertexAttributes = new Map<number, Attributes>();
  readonly #edgeKeys = new Set<string>();
  readonly #edges: EdgeStore = { sources: [], targets: [], weights: [], attributes: [] };

  public constructor(options: GraphBuilderOptions = {}) {
    this.#directed = options.directed ?? false;
    this.#allowParallel = options.allowParallelEdges ?? false;
  }

  /**
   * A builder pre-filled with `graph` (vertices, edges, weights and attributes), ready for more
   * additions and removals. Parallel edges stay allowed when the graph has some, unless overridden.
   */
  public static from(
    graph: Graph,
    options: Pick<GraphBuilderOptions, 'allowParallelEdges'> = {},
  ): GraphBuilder {
    const builder = new GraphBuilder({
      directed: graph.directed,
      allowParallelEdges: options.allowParallelEdges ?? hasParallelEdges(graph),
    });

    for (const id of graph.vertices()) {
      const attributes = graph.vertexAttributes(id);

      builder.addVertex(id, Object.keys(attributes).length > 0 ? attributes : undefined);
    }

    for (const { source, target, ...details } of graph.edges()) {
      builder.addEdge(source, target, details);
    }

    return builder;
  }

  public addVertex(id: VertexId, attributes?: Attributes): this {
    if (this.#indices.has(id)) {
      throw new DuplicateError(`Duplicate vertex: ${id}`);
    }

    if (attributes !== undefined) {
      this.#vertexAttributes.set(this.#indices.size, frozen(attributes));
    }

    this.#indices.set(id, this.#indices.size);

    return this;
  }

  /** `details` is the weight, or `{ weight?, attributes? }`. */
  public addEdge(
    source: VertexId,
    target: VertexId,
    details: Weight | EdgeDetails = DEFAULT_WEIGHT,
  ): this {
    const { weight = DEFAULT_WEIGHT, attributes } = detailsOf(details);
    const from = this.#indexOf(source);
    const to = this.#indexOf(target);

    this.#claim(from, to, `${source} -> ${target}`);
    this.#edges.sources.push(from);
    this.#edges.targets.push(to);
    this.#edges.weights.push(weight);
    this.#edges.attributes.push(attributes && frozen(attributes));

    return this;
  }

  /**
   * Removes every edge from `source` to `target` (in either direction when undirected).
   * $O(E)$, like {@link GraphBuilder.removeVertex}.
   */
  public removeEdge(source: VertexId, target: VertexId): this {
    const key = this.#keyOf(this.#indexOf(source), this.#indexOf(target));
    const removed = dropEdges(this.#edges, (from, to) => this.#keyOf(from, to) === key);

    if (removed === 0) {
      throw new UnknownEdgeError(`Unknown edge: ${source} -> ${target}`);
    }

    this.#rebuildKeys();

    return this;
  }

  /** Removes a vertex with its attributes and every edge touching it; later vertices keep their order. */
  public removeVertex(id: VertexId): this {
    const index = this.#indexOf(id);

    dropEdges(this.#edges, (from, to) => from === index || to === index);
    shiftDown(this.#edges.sources, index);
    shiftDown(this.#edges.targets, index);
    removeAttributes(this.#vertexAttributes, index);
    removeIndex(this.#indices, id);
    this.#rebuildKeys();

    return this;
  }

  public build(): Graph {
    const { sources, targets, weights, attributes } = this.#edges;
    const hasEdgeAttributes = attributes.some((entry) => entry !== undefined);
    const list = { sources, targets, weights, trackEdges: hasEdgeAttributes };
    const csr = buildCsr(this.#indices.size, list, this.#directed);

    return new CsrGraph([...this.#indices.keys()], csr, {
      directed: this.#directed,
      edgeCount: sources.length,
      ...this.#attributesShape(hasEdgeAttributes),
    });
  }

  #keyOf(from: number, to: number): string {
    return this.#directed || from <= to ? `${from}:${to}` : `${to}:${from}`;
  }

  /** Registers the endpoint pair, rejecting repeats unless parallel edges are allowed. */
  #claim(from: number, to: number, label: string): void {
    const key = this.#keyOf(from, to);

    if (!this.#allowParallel && this.#edgeKeys.has(key)) {
      throw new DuplicateError(`Duplicate edge: ${label}`);
    }

    this.#edgeKeys.add(key);
  }

  /** Recomputes the duplicate-detection keys from the current edges. */
  #rebuildKeys(): void {
    this.#edgeKeys.clear();

    for (const [from, to] of endpointPairs(this.#edges)) {
      this.#edgeKeys.add(this.#keyOf(from, to));
    }
  }

  #attributesShape(hasEdgeAttributes: boolean): { readonly attributes?: GraphAttributes } {
    if (!hasEdgeAttributes && this.#vertexAttributes.size === 0) {
      return {};
    }

    return {
      attributes: {
        vertices: new Map(this.#vertexAttributes),
        edges: [...this.#edges.attributes],
      },
    };
  }

  #indexOf(id: VertexId): number {
    const index = this.#indices.get(id);

    if (index === undefined) {
      throw new UnknownVertexError(`Unknown vertex: ${id}`);
    }

    return index;
  }
}
