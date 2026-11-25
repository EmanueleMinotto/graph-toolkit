import {
  betweennessCentrality,
  closenessCentrality,
  communities,
  degreeCentrality,
  isPlanar,
  maxFlow,
  maxFlowDinic,
  maximalCliques,
  maximumBipartiteMatching,
  maximumClique,
  pageRank,
  type Graph,
  type VertexId,
} from 'graph-toolkit';
import { edgeKey, NONE, type Highlight, type Selection } from './analysis-types.js';

export type NetworkKind =
  | 'max-flow'
  | 'max-flow-dinic'
  | 'matching'
  | 'pagerank'
  | 'degree'
  | 'closeness'
  | 'betweenness'
  | 'communities'
  | 'maximal-cliques'
  | 'maximum-clique'
  | 'planar';

const MAX_ROWS = 500;
const DEFAULT_DAMPING = 0.85;
const DEFAULT_ROUNDS = 100;

type Scores = ReadonlyMap<VertexId, number>;
type Groups = readonly (readonly VertexId[])[];

const rounded = (value: number): string => String(Number(value.toPrecision(4)));

function flow(solve: (graph: Graph, source: VertexId, sink: VertexId) => number, name: string) {
  return (graph: Graph, { from, to }: Selection): Highlight => {
    if (from === undefined || to === undefined)
      return { ...NONE, summary: 'Pick source and sink.' };
    const value = solve(graph, from, to);
    return {
      ...NONE,
      colors: new Map([
        [from, 1],
        [to, 2],
      ]),
      summary: `${name}: max flow ${from} → ${to} = ${value}`,
    };
  };
}

function matching(graph: Graph): Highlight {
  const { pairs, size } = maximumBipartiteMatching(graph);
  return {
    ...NONE,
    edges: new Set(pairs.map(([a, b]) => edgeKey(a, b, graph.directed))),
    colors: new Map(pairs.flatMap(([a, b]) => [[a, 1] as const, [b, 1] as const])),
    summary: `Maximum matching of size ${size}`,
    table: pairs.map(([a, b]) => [a, b]),
  };
}

/** Sizes vertices by score relative to the best one and lists scores, highest first. */
function scored(name: string, compute: (graph: Graph, parameter: number | undefined) => Scores) {
  return (graph: Graph, { count }: Selection): Highlight => {
    const entries = [...compute(graph, count)].toSorted(([, left], [, right]) => right - left);
    const best = entries[0];
    const top = best?.[1] ?? 0;
    return {
      ...NONE,
      sizes: new Map(entries.map(([id, score]) => [id, top > 0 ? score / top : 0])),
      summary: best === undefined ? `${name}: empty graph` : `${name}: highest is ${best[0]}`,
      table: entries.slice(0, MAX_ROWS).map(([id, score]) => [id, rounded(score)]),
    };
  };
}

function groupsOf(groups: Groups, summary: string): Highlight {
  const ordered = groups.toSorted((left, right) => right.length - left.length);
  return {
    ...NONE,
    colors: new Map(groups.flatMap((members, index) => members.map((id) => [id, index] as const))),
    summary,
    table: ordered
      .slice(0, MAX_ROWS)
      .map((members) => [String(members.length), members.join(', ')]),
  };
}

function communityGroups(graph: Graph, { count = DEFAULT_ROUNDS }: Selection): Highlight {
  const assignment = communities(graph, count);
  const groups = [...Map.groupBy(assignment, ([, group]) => group).values()].map((entries) =>
    entries.map(([id]) => id),
  );
  return groupsOf(groups, `${groups.length} communities`);
}

function biggestClique(graph: Graph): Highlight {
  const clique = maximumClique(graph);
  const pairs = clique.flatMap((a, index) => clique.slice(index + 1).map((b) => [a, b] as const));
  return {
    ...NONE,
    colors: new Map(clique.map((id) => [id, 1])),
    edges: new Set(pairs.map(([a, b]) => edgeKey(a, b, graph.directed))),
    summary: `Maximum clique of size ${clique.length}`,
    table: clique.map((id, index) => [String(index + 1), id]),
  };
}

export const networkAnalyses: Readonly<
  Record<NetworkKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  'max-flow': flow((graph, s, t) => maxFlow(graph, s, t), 'Edmonds–Karp'),
  'max-flow-dinic': flow((graph, s, t) => maxFlowDinic(graph, s, t), 'Dinic'),
  matching: (graph) => matching(graph),
  pagerank: scored('PageRank', (graph, damping) =>
    pageRank(graph, { damping: damping ?? DEFAULT_DAMPING }),
  ),
  degree: scored('Degree centrality', (graph) => degreeCentrality(graph)),
  closeness: scored('Closeness centrality', (graph) => closenessCentrality(graph)),
  betweenness: scored('Betweenness centrality', (graph) => betweennessCentrality(graph)),
  communities: communityGroups,
  'maximal-cliques': (graph) => {
    const cliques = maximalCliques(graph);
    return groupsOf(cliques, `${cliques.length} maximal cliques`);
  },
  'maximum-clique': (graph) => biggestClique(graph),
  planar: (graph) => ({ ...NONE, summary: isPlanar(graph) ? 'Planar.' : 'Not planar.' }),
};
