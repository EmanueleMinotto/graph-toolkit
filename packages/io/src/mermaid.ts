import type { Graph } from '@graph-sdk/core';

const safeId = (index: number): string => `n${index}`;

/** Mermaid flowchart (export only). Vertex ids become labels; weights label edges. */
export function toMermaid(graph: Graph): string {
  const arrow = graph.directed ? '-->' : '---';
  const nodes = graph
    .vertices()
    .map((id, index) => `  ${safeId(index)}["${id.replaceAll('"', '#quot;')}"]`);
  const edges = graph
    .edges()
    .map(
      (edge) =>
        `  ${safeId(graph.indexOf(edge.source))} ${arrow}|${edge.weight}| ${safeId(graph.indexOf(edge.target))}`,
    );

  return ['flowchart LR', ...nodes, ...edges, ''].join('\n');
}
