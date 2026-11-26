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
  /** Three vertices per arrowhead of a directed edge. */
  readonly arrows: Float32Array;
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
  if (colored !== undefined) {
    return [...paletteAt(colored), ON_ALPHA];
  }
  return highlight.edges.has(key) ? [...paletteAt(1), ON_ALPHA] : PLAIN_EDGE;
}

const vertexRow = (point: Pt, color: Rgb, diameter: number): readonly number[] => [
  point.x,
  point.y,
  ...color,
  1,
  diameter,
];

const ARROW_LENGTH = 10;
const ARROW_HALF_WIDTH = 4;
const TIP_GAP = 14;

/** Triangle rows for an arrowhead whose tip touches the edge's target vertex. */
function arrowRows(from: Pt, to: Pt, color: readonly number[]): readonly number[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) {
    return [];
  }
  const [dx, dy] = [(to.x - from.x) / length, (to.y - from.y) / length];
  const tip = { x: to.x - dx * TIP_GAP, y: to.y - dy * TIP_GAP };
  const base = { x: tip.x - dx * ARROW_LENGTH, y: tip.y - dy * ARROW_LENGTH };
  const [red = 0, green = 0, blue = 0, alpha = 1] = color;
  const row = (point: Pt): readonly number[] => [point.x, point.y, red, green, blue, alpha, 0];
  return [
    ...row(tip),
    ...row({ x: base.x - dy * ARROW_HALF_WIDTH, y: base.y + dx * ARROW_HALF_WIDTH }),
    ...row({ x: base.x + dy * ARROW_HALF_WIDTH, y: base.y - dx * ARROW_HALF_WIDTH }),
  ];
}

function arrowData(
  graph: Graph,
  position: SceneInput['position'],
  highlight: Highlight,
): readonly number[] {
  return graph.edges().flatMap((edge) => {
    const [from, to] = [position(edge.source), position(edge.target)];
    if (from === undefined || to === undefined) {
      return [];
    }
    const key = edgeKey(edge.source, edge.target, true);
    return arrowRows(from, to, edgeColor(highlight, key));
  });
}

/** Flat vertex data for every drawable edge and vertex of the graph. */
export function buildScene({ graph, position, highlight }: SceneInput): Scene {
  const edges = graph.edges().flatMap((edge) => {
    const [from, to] = [position(edge.source), position(edge.target)];
    if (from === undefined || to === undefined) {
      return [];
    }
    const [red, green, blue, alpha] = edgeColor(
      highlight,
      edgeKey(edge.source, edge.target, graph.directed),
    );
    const color: Rgb = [red, green, blue];
    return [...vertexRow(from, color, 0).with(5, alpha), ...vertexRow(to, color, 0).with(5, alpha)];
  });
  const vertices = graph.vertices().flatMap((id) => {
    const point = position(id);
    if (point === undefined) {
      return [];
    }
    const size = MIN_SCALE + (1 - MIN_SCALE) * (highlight.sizes?.get(id) ?? 1);
    const color = paletteAt(highlight.colors.get(id) ?? 0);
    return vertexRow(point, color, VERTEX_DIAMETER * size);
  });
  const arrows = graph.directed ? arrowData(graph, position, highlight) : [];
  return {
    edges: Float32Array.from(edges),
    vertices: Float32Array.from(vertices),
    arrows: Float32Array.from(arrows),
  };
}
