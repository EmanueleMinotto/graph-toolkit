import { vertexId, type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { assembleUnique } from './assemble.js';
import { assertSameKind } from './guards.js';

const pairId = (left: VertexId, right: VertexId): VertexId => vertexId(`(${left},${right})`);

const pairs = (left: Graph, right: Graph): readonly VertexId[] =>
  left.vertices().flatMap((a) => right.vertices().map((b) => pairId(a, b)));

/** Cartesian product G □ H; ids are `(a,b)` (ids containing commas may collide). */
export function cartesianProduct(left: Graph, right: Graph): Graph {
  assertSameKind(left, right);
  const along = (edge: Edge): readonly Edge[] =>
    right.vertices().map((b) => ({
      source: pairId(edge.source, b),
      target: pairId(edge.target, b),
      weight: edge.weight,
    }));
  const across = (edge: Edge): readonly Edge[] =>
    left.vertices().map((a) => ({
      source: pairId(a, edge.source),
      target: pairId(a, edge.target),
      weight: edge.weight,
    }));
  const edges = [
    ...left.edges().flatMap((edge) => along(edge)),
    ...right.edges().flatMap((edge) => across(edge)),
  ];
  return assembleUnique(left.directed, pairs(left, right), edges);
}

/** Tensor (categorical) product G × H; edge weights multiply. */
export function tensorProduct(left: Graph, right: Graph): Graph {
  assertSameKind(left, right);
  const edges = left
    .edges()
    .flatMap((first) =>
      right.edges().flatMap((second) => tensorEdges(first, second, left.directed)),
    );
  return assembleUnique(left.directed, pairs(left, right), edges);
}

function tensorEdges(first: Edge, second: Edge, isDirected: boolean): readonly Edge[] {
  const weight = first.weight * second.weight;
  const forward = {
    source: pairId(first.source, second.source),
    target: pairId(first.target, second.target),
    weight,
  };
  if (isDirected) return [forward];
  const crossed = {
    source: pairId(first.source, second.target),
    target: pairId(first.target, second.source),
    weight,
  };
  return [forward, crossed];
}
