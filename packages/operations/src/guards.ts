import { GraphError, type Graph } from '@graph-sdk/core';

export function assertSameKind(left: Graph, right: Graph): void {
  if (left.directed !== right.directed) {
    throw new GraphError('Graphs must both be directed or not');
  }
}
