import { parseArgs } from 'node:util';
import { GraphError, type Graph } from '@graph-sdk/core';
import {
  completeGraph,
  cycleGraph,
  hypercubeGraph,
  pathGraph,
  randomGraph,
  starGraph,
  wheelGraph,
  binaryTreeGraph,
} from '@graph-sdk/generators';
import { connectedComponents, stronglyConnectedComponents } from '@graph-sdk/traversal';
import { FORMATS } from './formats.js';

/** Where the CLI reads and writes; `readInput(undefined)` reads standard input. */
export interface CliIo {
  readonly readInput: (path: string | undefined) => string;
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
}

interface Settings {
  readonly directed: boolean;
  readonly probability: number;
  readonly seed: number;
}

const USAGE = `Usage:
  graph-toolkit convert --from <format> --to <format> [file]
  graph-toolkit generate <kind> <count> --to <format> [--directed] [--probability p --seed s]
  graph-toolkit info --from <format> [file]

Formats: ${Object.keys(FORMATS).join(', ')}
Kinds: path, cycle, complete, star, wheel, binary-tree, hypercube, random
Without [file], standard input is read.
`;

const GENERATORS: Readonly<Record<string, (count: number, settings: Settings) => Graph>> = {
  path: (count, { directed }) => pathGraph(count, { directed }),
  cycle: (count, { directed }) => cycleGraph(count, { directed }),
  complete: (count, { directed }) => completeGraph(count, { directed }),
  star: (count, { directed }) => starGraph(count, { directed }),
  wheel: (count, { directed }) => wheelGraph(count, { directed }),
  'binary-tree': (count, { directed }) => binaryTreeGraph(count, { directed }),
  hypercube: (count, { directed }) => hypercubeGraph(count, { directed }),
  random: (count, settings) => randomGraph(count, settings),
};

const formatOf = (
  name: string | undefined,
  flag: string,
): NonNullable<(typeof FORMATS)[string]> => {
  const format = name !== undefined && Object.hasOwn(FORMATS, name) ? FORMATS[name] : undefined;

  if (format === undefined) {
    throw new GraphError(`--${flag} must be one of: ${Object.keys(FORMATS).join(', ')}`);
  }

  return format;
};

const withNewline = (text: string): string => (text.endsWith('\n') ? text : `${text}\n`);

function info(graph: Graph): string {
  const { vertexCount: vertices, edgeCount: edges, directed } = graph;
  const components = directed
    ? stronglyConnectedComponents(graph).length
    : connectedComponents(graph).length;
  const pairs = directed ? vertices * (vertices - 1) : (vertices * (vertices - 1)) / 2;

  return `${JSON.stringify({ directed, vertices, edges, components, density: pairs > 0 ? edges / pairs : 0 }, undefined, 2)}\n`;
}

interface Parsed {
  readonly values: {
    readonly from?: string;
    readonly to?: string;
    readonly directed: boolean;
    readonly probability: string;
    readonly seed: string;
  };
  readonly positionals: readonly string[];
}

const parse = (argv: readonly string[]): Parsed =>
  parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      directed: { type: 'boolean', default: false },
      probability: { type: 'string', default: '0.5' },
      seed: { type: 'string', default: '0' },
    },
  });

function generate({ values, positionals }: Parsed): string {
  const [, kind, count] = positionals;
  const build =
    kind !== undefined && Object.hasOwn(GENERATORS, kind) ? GENERATORS[kind] : undefined;

  if (build === undefined) {
    throw new GraphError(USAGE);
  }

  const settings = {
    directed: values.directed,
    probability: Number(values.probability),
    seed: Number(values.seed),
  };
  const format = formatOf(values.to, 'to');

  const graph = build(Number(count), settings);

  return withNewline(format.write(graph));
}

function execute(argv: readonly string[], io: CliIo): string {
  const parsed = parse(argv);
  const [command, file] = parsed.positionals;

  if (command === 'generate') {
    return generate(parsed);
  }

  if (command === 'convert') {
    const target = formatOf(parsed.values.to, 'to');
    const graph = formatOf(parsed.values.from, 'from').read(io.readInput(file));

    return withNewline(target.write(graph));
  }

  if (command === 'info') {
    const source = formatOf(parsed.values.from, 'from');

    return info(source.read(io.readInput(file)));
  }

  throw new GraphError(USAGE);
}

/** Runs one command line and returns the process exit code: 0 on success, 1 on any error. */
export function run(argv: readonly string[], io: CliIo): number {
  try {
    io.out(execute(argv, io));

    return 0;
  } catch (error) {
    io.err(`${error instanceof Error ? error.message : String(error)}\n`);

    return 1;
  }
}
