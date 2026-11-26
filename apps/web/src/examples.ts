import {
  barabasiAlbertGraph,
  binaryTreeGraph,
  completeBipartiteGraph,
  GraphBuilder,
  hypercubeGraph,
  petersenGraph,
  vertexId,
  wattsStrogatzGraph,
  wheelGraph,
  type Graph,
} from 'graph-toolkit';

export interface Example {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly build: () => Graph;
}

type Link = readonly [string, string, number?];

function from(directed: boolean, links: readonly Link[]): Graph {
  const builder = new GraphBuilder({ directed });
  const names = new Set(links.flatMap(([source, target]) => [source, target]));
  for (const name of names) {
    builder.addVertex(vertexId(name));
  }
  for (const [source, target, weight] of links) {
    builder.addEdge(vertexId(source), vertexId(target), weight);
  }
  return builder.build();
}

const SCALE_FREE_SIZE = 40;
const SMALL_WORLD_SIZE = 30;

export const EXAMPLES: readonly Example[] = [
  {
    id: 'petersen',
    label: 'Petersen graph',
    description: '3-regular, not planar, a classic counterexample',
    build: () => petersenGraph(),
  },
  {
    id: 'k33',
    label: 'K3,3 (utilities puzzle)',
    description: 'Bipartite and not planar',
    build: () => completeBipartiteGraph(3, 3),
  },
  {
    id: 'cube',
    label: 'Cube Q3',
    description: 'Hypercube of dimension 3: bipartite, planar',
    build: () => hypercubeGraph(3),
  },
  {
    id: 'wheel',
    label: 'Wheel W7',
    description: 'A hub joined to a 6-cycle',
    build: () => wheelGraph(7),
  },
  {
    id: 'tree',
    label: 'Binary tree',
    description: '15 vertices: try the rooted tree and LCA tools',
    build: () => binaryTreeGraph(15),
  },
  {
    id: 'bowtie',
    label: 'Bowtie with a tail',
    description: 'Two triangles sharing a vertex: articulation points and bridges',
    build: () =>
      from(false, [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
        ['c', 'd'],
        ['d', 'e'],
        ['e', 'c'],
        ['e', 'f'],
      ]),
  },
  {
    id: 'roads',
    label: 'Road map',
    description: 'Weighted and undirected: shortest paths and spanning trees',
    build: () =>
      from(false, [
        ['A', 'B', 4],
        ['A', 'C', 2],
        ['B', 'C', 5],
        ['B', 'D', 10],
        ['C', 'E', 3],
        ['E', 'D', 4],
        ['D', 'F', 11],
      ]),
  },
  {
    id: 'flow',
    label: 'Flow network',
    description: 'Directed capacities from s to t: max flow and minimum cut',
    build: () =>
      from(true, [
        ['s', 'a', 10],
        ['s', 'b', 10],
        ['a', 'b', 2],
        ['a', 'c', 4],
        ['a', 'd', 8],
        ['b', 'd', 9],
        ['d', 'c', 6],
        ['c', 't', 10],
        ['d', 't', 10],
      ]),
  },
  {
    id: 'courses',
    label: 'Course prerequisites',
    description: 'A DAG: topological order and layered layout',
    build: () =>
      from(true, [
        ['Intro', 'Algorithms'],
        ['Intro', 'Discrete'],
        ['Discrete', 'Graphs'],
        ['Algorithms', 'Graphs'],
        ['Graphs', 'Networks'],
        ['Algorithms', 'Complexity'],
      ]),
  },
  {
    id: 'scale-free',
    label: 'Scale-free network',
    description: 'Barabási–Albert: a few hubs, many leaves',
    build: () => barabasiAlbertGraph(SCALE_FREE_SIZE, { attach: 2, seed: 11 }),
  },
  {
    id: 'small-world',
    label: 'Small-world network',
    description: 'Watts–Strogatz: high clustering, short paths',
    build: () => wattsStrogatzGraph(SMALL_WORLD_SIZE, { neighbors: 4, beta: 0.15, seed: 5 }),
  },
];
