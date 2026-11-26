import { CsrGraph, type GraphAttributes } from './csr-graph.js';
import { DuplicateError, UnknownVertexError } from './errors.js';
import { buildCsr } from './internal/csr.js';
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
  readonly #sources: number[] = [];
  readonly #targets: number[] = [];
  readonly #weights: number[] = [];
  readonly #edgeAttributes: (Attributes | undefined)[] = [];

  public constructor(options: GraphBuilderOptions = {}) {
    this.#directed = options.directed ?? false;
    this.#allowParallel = options.allowParallelEdges ?? false;
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
    this.#sources.push(from);
    this.#targets.push(to);
    this.#weights.push(weight);
    this.#edgeAttributes.push(attributes && frozen(attributes));

    return this;
  }

  public build(): Graph {
    const hasEdgeAttributes = this.#edgeAttributes.some((attributes) => attributes !== undefined);
    const csr = buildCsr(
      this.#indices.size,
      {
        sources: this.#sources,
        targets: this.#targets,
        weights: this.#weights,
        trackEdges: hasEdgeAttributes,
      },
      this.#directed,
    );

    return new CsrGraph([...this.#indices.keys()], csr, {
      directed: this.#directed,
      edgeCount: this.#sources.length,
      ...this.#attributesShape(hasEdgeAttributes),
    });
  }

  /** Registers the endpoint pair, rejecting repeats unless parallel edges are allowed. */
  #claim(from: number, to: number, label: string): void {
    const key = this.#directed || from <= to ? `${from}:${to}` : `${to}:${from}`;

    if (!this.#allowParallel && this.#edgeKeys.has(key)) {
      throw new DuplicateError(`Duplicate edge: ${label}`);
    }

    this.#edgeKeys.add(key);
  }

  #attributesShape(hasEdgeAttributes: boolean): { readonly attributes?: GraphAttributes } {
    if (!hasEdgeAttributes && this.#vertexAttributes.size === 0) {
      return {};
    }

    return {
      attributes: {
        vertices: new Map(this.#vertexAttributes),
        edges: [...this.#edgeAttributes],
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
