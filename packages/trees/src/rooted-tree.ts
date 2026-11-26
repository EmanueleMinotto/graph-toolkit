import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import {
  liftingTable,
  lowestCommonAncestor,
  rootAt,
  valueAt,
  type Parents,
} from './internal/rooted.js';
import { isTree } from './trees.js';

/** A tree viewed from a chosen root. LCA queries take $O(\log V)$ after $O(V \log V)$ setup. */
export class RootedTree {
  public readonly root: VertexId;
  readonly #graph: Graph;
  readonly #parents: Parents;
  readonly #table: readonly Int32Array[];

  public constructor(graph: Graph, root: VertexId) {
    if (graph.directed || !isTree(graph)) {
      throw new GraphError('RootedTree requires an undirected tree');
    }

    this.root = root;
    this.#graph = graph;
    this.#parents = rootAt(graph.csr, graph.vertexCount, graph.indexOf(root));
    this.#table = liftingTable(this.#parents);
  }

  /** `undefined` for the root. */
  public parentOf(vertex: VertexId): VertexId | undefined {
    const parent = valueAt(this.#parents.parent, this.#graph.indexOf(vertex));

    return parent === -1 ? undefined : this.#graph.vertexAt(parent);
  }

  public depthOf(vertex: VertexId): number {
    return valueAt(this.#parents.depth, this.#graph.indexOf(vertex));
  }

  public childrenOf(vertex: VertexId): readonly VertexId[] {
    return this.#graph
      .neighbors(vertex)
      .map((edge) => edge.target)
      .filter((id) => this.parentOf(id) === vertex);
  }

  public lowestCommonAncestor(left: VertexId, right: VertexId): VertexId {
    const pair = [this.#graph.indexOf(left), this.#graph.indexOf(right)] as const;

    return this.#graph.vertexAt(lowestCommonAncestor(this.#table, this.#parents.depth, pair));
  }
}
