import { findPath, type Adjacency } from './bfs-path.js';
import type { Pair } from './biconnected.js';

interface Embedding {
  readonly adjacency: Adjacency;
  readonly vertices: Set<number>;
  readonly edges: Set<string>;
  faces: number[][];
}

interface Fragment {
  readonly attachments: readonly number[];
  readonly path: readonly number[];
}

const keyOf = (left: number, right: number): string =>
  left < right ? `${left}:${right}` : `${right}:${left}`;

function embedPath(state: Embedding, path: readonly number[]): void {
  for (const [index, vertex] of path.entries()) {
    state.vertices.add(vertex);
    if (index > 0) state.edges.add(keyOf(path[index - 1]!, vertex));
  }
}

function isFreeChord({ vertices, edges }: Embedding, left: number, right: number): boolean {
  return (
    left < right && vertices.has(left) && vertices.has(right) && !edges.has(keyOf(left, right))
  );
}

/** Unembedded edges whose endpoints are both already embedded. */
function chordFragments(state: Embedding): Fragment[] {
  const chords: Fragment[] = [];
  for (const [vertex, around] of state.adjacency) {
    for (const next of around) {
      if (isFreeChord(state, vertex, next)) {
        chords.push({ attachments: [vertex, next], path: [vertex, next] });
      }
    }
  }
  return chords;
}

interface Component {
  readonly members: Set<number>;
  readonly attachments: Set<number>;
}

function collectComponent(state: Embedding, start: number, seen: Set<number>): Component {
  const members = new Set([start]);
  const attachments = new Set<number>();
  seen.add(start);
  for (const member of members) {
    for (const next of state.adjacency.get(member)!) {
      if (state.vertices.has(next)) attachments.add(next);
      else if (!seen.has(next)) {
        seen.add(next);
        members.add(next);
      }
    }
  }
  return { members, attachments };
}

function componentFragment(state: Embedding, { members, attachments }: Component): Fragment {
  const [first] = attachments;
  const path = findPath(state.adjacency, first!, {
    isGoal: (vertex) => attachments.has(vertex) && vertex !== first,
    isBlocked: (source, target) => source === first && !members.has(target),
  });
  return { attachments: [...attachments], path };
}

function fragmentsOf(state: Embedding): Fragment[] {
  const seen = new Set<number>();
  const fragments = chordFragments(state);
  for (const start of state.adjacency.keys()) {
    if (state.vertices.has(start) || seen.has(start)) continue;
    fragments.push(componentFragment(state, collectComponent(state, start, seen)));
  }
  return fragments;
}

const containsAll = (face: readonly number[], vertices: readonly number[]): boolean =>
  vertices.every((vertex) => face.includes(vertex));

function cyclicSlice(face: readonly number[], from: number, to: number): number[] {
  const out = [face[from]!];
  for (let index = from; index !== to;) {
    index = (index + 1) % face.length;
    out.push(face[index]!);
  }
  return out;
}

function splitFace(face: readonly number[], path: readonly number[]): number[][] {
  const [start, end] = [face.indexOf(path[0]!), face.indexOf(path.at(-1)!)];
  const interior = path.slice(1, -1);
  return [
    [...cyclicSlice(face, start, end), ...interior.toReversed()],
    [...cyclicSlice(face, end, start), ...interior],
  ];
}

/** One DMP step; false when some fragment fits in no face (non-planar). */
function step(state: Embedding): boolean {
  const options = fragmentsOf(state).map((fragment) => ({
    fragment,
    faces: state.faces.filter((face) => containsAll(face, fragment.attachments)),
  }));
  const [pick] = options.toSorted((left, right) => left.faces.length - right.faces.length);
  const face = pick?.faces[0];
  if (pick === undefined || face === undefined) return false;
  embedPath(state, pick.fragment.path);
  const rest = state.faces.filter((other) => other !== face);
  state.faces = [...rest, ...splitFace(face, pick.fragment.path)];
  return true;
}

function cycleThrough(adjacency: Adjacency, edge: Pair): number[] {
  return findPath(adjacency, edge[0], {
    isGoal: (vertex) => vertex === edge[1],
    isBlocked: (source, target) => source === edge[0] && target === edge[1],
  });
}

/** Demoucron–Malgrange–Pertuiset planarity test for one biconnected block. */
export function isBlockPlanar(blockEdges: readonly Pair[]): boolean {
  const adjacency = new Map<number, Set<number>>();
  for (const [left, right] of blockEdges) {
    adjacency.set(left, (adjacency.get(left) ?? new Set()).add(right));
    adjacency.set(right, (adjacency.get(right) ?? new Set()).add(left));
  }
  const cycle = cycleThrough(adjacency, blockEdges[0]!);
  const faces = [cycle, cycle.toReversed()];
  const state: Embedding = { adjacency, vertices: new Set(), edges: new Set(), faces };
  embedPath(state, [...cycle, cycle[0]!]);
  while (state.edges.size < blockEdges.length) {
    if (!step(state)) return false;
  }
  return true;
}
