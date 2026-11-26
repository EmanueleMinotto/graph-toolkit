import { CsrGraph } from './csr-graph.js';
import { DuplicateError, UnknownVertexError } from './errors.js';
import { buildCsr } from './internal/csr.js';
import { DEFAULT_WEIGHT, type Graph, type VertexId, type Weight } from './types.js';

export interface GraphBuilderOptions {
  readonly directed?: boolean;
  /** Allow several edges between the same endpoints (multigraph). Default false. */
  readonly allowParallelEdges?: boolean;
}

/** Mutable accumulator that produces an immutable {@link Graph} via `build()`. */
export class GraphBuilder {
  readonly #directed: boolean;
  readonly #allowParallel: boolean;
  readonly #indices = new Map<VertexId, number>();
  readonly #edgeKeys = new Set<string>();
  readonly #sources: number[] = [];
  readonly #targets: number[] = [];
  readonly #weights: number[] = [];

  public constructor(options: GraphBuilderOptions = {}) {
    this.#directed = options.directed ?? false;
    this.#allowParallel = options.allowParallelEdges ?? false;
  }

  public addVertex(id: VertexId): this {
    if (this.#indices.has(id)) {
      throw new DuplicateError(`Duplicate vertex: ${id}`);
    }
    this.#indices.set(id, this.#indices.size);
    return this;
  }

  public addEdge(source: VertexId, target: VertexId, weight: Weight = DEFAULT_WEIGHT): this {
    const from = this.#indexOf(source);
    const to = this.#indexOf(target);
    const key = this.#directed || from <= to ? `${from}:${to}` : `${to}:${from}`;
    if (!this.#allowParallel && this.#edgeKeys.has(key)) {
      throw new DuplicateError(`Duplicate edge: ${source} -> ${target}`);
    }
    this.#edgeKeys.add(key);
    this.#sources.push(from);
    this.#targets.push(to);
    this.#weights.push(weight);
    return this;
  }

  public build(): Graph {
    const csr = buildCsr(
      this.#indices.size,
      { sources: this.#sources, targets: this.#targets, weights: this.#weights },
      this.#directed,
    );
    return new CsrGraph([...this.#indices.keys()], csr, {
      directed: this.#directed,
      edgeCount: this.#sources.length,
    });
  }

  #indexOf(id: VertexId): number {
    const index = this.#indices.get(id);
    if (index === undefined) {
      throw new UnknownVertexError(`Unknown vertex: ${id}`);
    }
    return index;
  }
}
