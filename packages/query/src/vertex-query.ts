import {
  GraphBuilder,
  GraphError,
  UnknownVertexError,
  type Attributes,
  type AttributeValue,
  type Edge,
  type Graph,
  type VertexId,
} from '@graph-sdk/core';

export type VertexPredicate = (id: VertexId, attributes: Attributes) => boolean;

const reach = (graph: Graph, ids: ReadonlySet<VertexId>, hops: number): ReadonlySet<VertexId> => {
  const grown = new Set([
    ...ids,
    ...[...ids].flatMap((id) => graph.neighbors(id).map(({ target }) => target)),
  ]);

  return hops <= 1 || grown.size === ids.size ? grown : reach(graph, grown, hops - 1);
};

/**
 * An immutable selection of vertices of one graph; every method returns a new selection (or a
 * plain value) and keeps the graph's vertex order.
 */
export class VertexQuery {
  readonly #graph: Graph;
  readonly #ids: readonly VertexId[];

  /** `ids` defaults to every vertex. Throws {@link UnknownVertexError} for an id not in `graph`. */
  public constructor(graph: Graph, ids: readonly VertexId[] = graph.vertices()) {
    const unknown = ids.find((id) => !graph.hasVertex(id));

    if (unknown !== undefined) {
      throw new UnknownVertexError(`Unknown vertex: ${unknown}`);
    }

    this.#graph = graph;
    this.#ids = ids;
  }

  /** Keeps the vertices `predicate` accepts. */
  public where(predicate: VertexPredicate): VertexQuery {
    return new VertexQuery(
      this.#graph,
      this.#ids.filter((id) => predicate(id, this.#graph.vertexAttributes(id))),
    );
  }

  /** Keeps vertices carrying attribute `key`, with that exact `value` when one is given. */
  public withAttribute(key: string, value?: AttributeValue): VertexQuery {
    return this.where(
      (_id, attributes) =>
        Object.hasOwn(attributes, key) && (value === undefined || attributes[key] === value),
    );
  }

  /** The vertices reachable by one outgoing edge from the selection (itself excluded unless looped). */
  public neighbors(): VertexQuery {
    const targets = new Set(
      this.#ids.flatMap((id) => this.#graph.neighbors(id).map(({ target }) => target)),
    );

    return new VertexQuery(
      this.#graph,
      this.#graph.vertices().filter((id) => targets.has(id)),
    );
  }

  /** The selection plus everything within `hops` outgoing edges of it. Throws {@link GraphError} on a negative or non-integer `hops`. */
  public within(hops: number): VertexQuery {
    if (!Number.isSafeInteger(hops) || hops < 0) {
      throw new GraphError(`hops must be a non-negative integer, got ${hops}`);
    }

    const reached = hops === 0 ? new Set(this.#ids) : reach(this.#graph, new Set(this.#ids), hops);

    return new VertexQuery(
      this.#graph,
      this.#graph.vertices().filter((id) => reached.has(id)),
    );
  }

  public ids(): readonly VertexId[] {
    return this.#ids;
  }

  public count(): number {
    return this.#ids.length;
  }

  /** Edges with both endpoints in the selection. */
  public edges(): readonly Edge[] {
    const chosen = new Set(this.#ids);

    return this.#graph
      .edges()
      .filter(({ source, target }) => chosen.has(source) && chosen.has(target));
  }

  /** The graph induced by the selection, with vertex and edge attributes kept. */
  public subgraph(): Graph {
    const builder = new GraphBuilder({
      directed: this.#graph.directed,
      allowParallelEdges: true,
    });

    for (const id of this.#ids) {
      const attributes = this.#graph.vertexAttributes(id);

      builder.addVertex(id, Object.keys(attributes).length > 0 ? attributes : undefined);
    }

    for (const { source, target, ...details } of this.edges()) {
      builder.addEdge(source, target, details);
    }

    return builder.build();
  }
}

/** Starts a query on every vertex of `graph`, or on `ids` when given. */
export const selectVertices = (graph: Graph, ids?: readonly VertexId[]): VertexQuery =>
  new VertexQuery(graph, ids);
