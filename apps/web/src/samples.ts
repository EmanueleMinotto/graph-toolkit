import {
  barabasiAlbertGraph,
  binaryTreeGraph,
  completeGraph,
  cycleGraph,
  gridGraph,
  hypercubeGraph,
  pathGraph,
  petersenGraph,
  randomGraph,
  starGraph,
  wattsStrogatzGraph,
  wheelGraph,
  type Graph,
} from 'graph-toolkit';

export type SampleKind =
  | 'path'
  | 'cycle'
  | 'complete'
  | 'grid'
  | 'star'
  | 'random'
  | 'wheel'
  | 'binary-tree'
  | 'hypercube'
  | 'petersen'
  | 'scale-free'
  | 'small-world';

export const SAMPLES: readonly SampleKind[] = [
  'path',
  'cycle',
  'complete',
  'grid',
  'star',
  'random',
  'wheel',
  'binary-tree',
  'hypercube',
  'petersen',
  'scale-free',
  'small-world',
];

export interface GenerateOptions {
  readonly directed: boolean;
  readonly seed: number;
  /** Edge probability for `random`; `undefined` picks a density that keeps large graphs sparse. */
  readonly probability: number | undefined;
}

/** A fresh seed, so every generation from the UI yields a different graph. */
export const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

/** Fixed seed for reproducible tests; the UI always passes `randomSeed()` unless the user types one. */
export const DEFAULT_OPTIONS: GenerateOptions = {
  directed: false,
  seed: 7,
  probability: undefined,
};

const EDGE_PROBABILITY = 0.25;
const AVERAGE_DEGREE = 6;

/** Largest accepted size per kind; dense kinds are capped lower to keep the SVG responsive. */
export const MAX_SIZE: Readonly<Record<SampleKind, number>> = {
  path: 2000,
  cycle: 2000,
  star: 2000,
  random: 1000,
  grid: 40, // side length: 40 × 40 = 1600 vertices
  complete: 150, // 150 vertices = 11 175 edges
  wheel: 2000,
  'binary-tree': 2000,
  hypercube: 10, // dimension: 2^10 = 1024 vertices
  petersen: 1, // fixed size, the size field is ignored
  'scale-free': 1000,
  'small-world': 1000,
};

/** Dense for small graphs, sparse (about `AVERAGE_DEGREE` neighbours) for large ones. */
const randomProbability = (size: number): number =>
  Math.min(EDGE_PROBABILITY, AVERAGE_DEGREE / Math.max(size - 1, 1));

type Builder = (size: number, options: GenerateOptions) => Graph;

const samples: Readonly<Record<SampleKind, Builder>> = {
  path: (size, { directed }) => pathGraph(size, { directed }),
  cycle: (size, { directed }) => cycleGraph(size, { directed }),
  complete: (size, { directed }) => completeGraph(size, { directed }),
  grid: (size, { directed }) => gridGraph(size, size, { directed }),
  star: (size, { directed }) => starGraph(size, { directed }),
  wheel: (size, { directed }) => wheelGraph(size, { directed }),
  'binary-tree': (size, { directed }) => binaryTreeGraph(size, { directed }),
  hypercube: (size, { directed }) => hypercubeGraph(size, { directed }),
  petersen: (_size, { directed }) => petersenGraph({ directed }),
  'scale-free': (size, { directed, seed }) =>
    barabasiAlbertGraph(size, { directed, seed, attach: 2 }),
  'small-world': (size, { directed, seed }) =>
    wattsStrogatzGraph(size, { directed, seed, neighbors: 4, beta: 0.2 }),
  random: (size, { directed, seed, probability }) =>
    randomGraph(size, { directed, seed, probability: probability ?? randomProbability(size) }),
};

const clampSize = (kind: SampleKind, size: number): number =>
  Math.min(Math.max(size, 1), MAX_SIZE[kind]);

export const makeSample = (
  kind: SampleKind,
  size: number,
  options: GenerateOptions = DEFAULT_OPTIONS,
): Graph => samples[kind](clampSize(kind, Math.trunc(size)), options);
