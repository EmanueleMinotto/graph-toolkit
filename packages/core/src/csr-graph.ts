import { UnknownVertexError } from './errors.js';
import { arcsOf, outDegree } from './internal/csr.js';
import type { Csr, Edge, Graph, VertexId } from './types.js';

export interface GraphShape {
  readonly directed: boolean;
  readonly edgeCount: number;
}

/** CSR-backed {@link Graph}. Build instances with `GraphBuilder`. */
export class CsrGraph implements Graph {
  public readonly vertexCount: number;
  public readonly directed: boolean;
  public readonly edgeCount: number;
  readonly #ids: readonly VertexId[];
  readonly #indices: ReadonlyMap<VertexId, number>;

  public constructor(
    ids: readonly VertexId[],
    public readonly csr: Csr,
    shape: GraphShape,
  ) {
    this.directed = shape.directed;
    this.edgeCount = shape.edgeCount;
    this.#ids = ids;
    this.#indices = new Map(ids.map((id, index) => [id, index]));
    this.vertexCount = ids.length;
  }

  public vertices(): readonly VertexId[] {
    return this.#ids;
  }

  public hasVertex(id: VertexId): boolean {
    return this.#indices.has(id);
  }

  public indexOf(id: VertexId): number {
    const index = this.#indices.get(id);

    if (index === undefined) {
      throw new UnknownVertexError(`Unknown vertex: ${id}`);
    }

    return index;
  }

  public vertexAt(index: number): VertexId {
    const id = this.#ids[index];

    if (id === undefined) {
      throw new UnknownVertexError(`Unknown vertex index: ${String(index)}`);
    }

    return id;
  }

  public degree(id: VertexId): number {
    return outDegree(this.csr, this.indexOf(id));
  }

  public neighbors(id: VertexId): readonly Edge[] {
    const vertex = this.indexOf(id);

    return this.#arcs(vertex, (target) => target >= 0);
  }

  public hasEdge(source: VertexId, target: VertexId): boolean {
    const targetIndex = this.indexOf(target);

    return this.#arcs(this.indexOf(source), (arcTarget) => arcTarget === targetIndex).length > 0;
  }

  public edges(): readonly Edge[] {
    return this.#ids.flatMap((_, vertex) =>
      this.#arcs(vertex, (target) => this.directed || vertex <= target),
    );
  }

  #arcs(vertex: number, keep: (target: number) => boolean): readonly Edge[] {
    const source = this.vertexAt(vertex);

    return arcsOf(this.csr, vertex, keep).map((arc) => ({
      source,
      target: this.vertexAt(arc.target),
      weight: arc.weight,
    }));
  }
}
