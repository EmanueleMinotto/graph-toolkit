import { type Graph, type VertexId } from 'graph-toolkit';
import { edgeKey, type Highlight } from './analysis-types.js';
import { type Pt } from './viewport.js';

type Rgb = readonly [number, number, number];

const rgb = (hex: number): Rgb => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** Mantine blue, orange, green, grape, yellow, cyan, pink, gray (shade 6), as in `styles.css`. */
export const PALETTE: readonly Rgb[] = [
  0x22_8b_e6, 0xfd_7e_14, 0x40_c0_57, 0xbe_4b_db, 0xfa_b0_05, 0x15_aa_bf, 0xe6_49_80, 0x86_8e_96,
].map((hex) => rgb(hex));

const PLAIN_EDGE: readonly [number, number, number, number] = [0.53, 0.56, 0.59, 0.55];
const ON_ALPHA = 0.95;
const VERTEX_DIAMETER = 28;
/** Smallest diameter, as a fraction of the full one, when vertices are sized by score. */
const MIN_SCALE = 0.6;

/** Floats per vertex: x, y, red, green, blue, alpha, diameter (canvas units). */
export const STRIDE = 7;

export interface Scene {
  /** Two vertices per edge. */
  readonly edges: Float32Array;
  /** One vertex per graph vertex. */
  readonly vertices: Float32Array;
}

export interface SceneInput {
  readonly graph: Graph;
  readonly position: (id: VertexId) => Pt | undefined;
  readonly highlight: Highlight;
}

const FALLBACK: Rgb = [0.13, 0.55, 0.9];
const paletteAt = (index: number): Rgb => PALETTE[index % PALETTE.length] ?? FALLBACK;

function edgeColor(highlight: Highlight, key: string): readonly [number, number, number, number] {
  const colored = highlight.edgeColors?.get(key);
  if (colored !== undefined) return [...paletteAt(colored), ON_ALPHA];
  return highlight.edges.has(key) ? [...paletteAt(1), ON_ALPHA] : PLAIN_EDGE;
}

const vertexRow = (point: Pt, color: Rgb, diameter: number): readonly number[] => [
  point.x,
  point.y,
  ...color,
  1,
  diameter,
];

/** Flat vertex data for every drawable edge and vertex of the graph. */
export function buildScene({ graph, position, highlight }: SceneInput): Scene {
  const edges = graph.edges().flatMap((edge) => {
    const [from, to] = [position(edge.source), position(edge.target)];
    if (from === undefined || to === undefined) return [];
    const [red, green, blue, alpha] = edgeColor(
      highlight,
      edgeKey(edge.source, edge.target, graph.directed),
    );
    const color: Rgb = [red, green, blue];
    return [...vertexRow(from, color, 0).with(5, alpha), ...vertexRow(to, color, 0).with(5, alpha)];
  });
  const vertices = graph.vertices().flatMap((id) => {
    const point = position(id);
    if (point === undefined) return [];
    const size = MIN_SCALE + (1 - MIN_SCALE) * (highlight.sizes?.get(id) ?? 1);
    const color = paletteAt(highlight.colors.get(id) ?? 0);
    return vertexRow(point, color, VERTEX_DIAMETER * size);
  });
  return { edges: Float32Array.from(edges), vertices: Float32Array.from(vertices) };
}
