import {
  IconAbc,
  IconArrowMerge,
  IconArrowsJoin2,
  IconArrowsRightLeft,
  IconArrowsSplit2,
  IconAtom2,
  IconBan,
  IconBinaryTree,
  IconBraces,
  IconChartDots,
  IconCircleDashed,
  IconCircleDot,
  IconCircles,
  IconCode,
  IconCut,
  IconDice5,
  IconEqual,
  IconGrid3x3,
  IconGridDots,
  IconHierarchy,
  IconHierarchy2,
  IconList,
  IconNetwork,
  IconNumbers,
  IconPalette,
  IconRefresh,
  IconReplace,
  IconRoute,
  IconRoute2,
  IconSortAscending,
  IconStack2,
  IconStar,
  IconSwitchHorizontal,
  IconTable,
  IconTimeline,
  IconTopologyStar3,
  IconTrash,
  IconVectorBezier2,
  IconX,
  type Icon,
} from '@tabler/icons-react';

/** Icons by id, so lists of choices stay readable and every option is recognizable at a glance. */
export const FORMAT_ICONS: Readonly<Record<string, Icon>> = {
  json: IconBraces,
  'edge-list': IconList,
  dot: IconHierarchy,
  graphml: IconCode,
  gexf: IconCode,
  gml: IconCode,
  graph6: IconNumbers,
  'adjacency-csv': IconTable,
  mermaid: IconVectorBezier2,
  prufer: IconNumbers,
};

export const LAYOUT_ICONS: Readonly<Record<string, Icon>> = {
  force: IconTopologyStar3,
  circular: IconCircleDashed,
  grid: IconGridDots,
  layered: IconStack2,
  radial: IconCircles,
};

export const SAMPLE_ICONS: Readonly<Record<string, Icon>> = {
  path: IconRoute,
  cycle: IconRefresh,
  complete: IconNetwork,
  grid: IconGridDots,
  star: IconStar,
  random: IconDice5,
  wheel: IconCircleDot,
  'binary-tree': IconBinaryTree,
  hypercube: IconGrid3x3,
  petersen: IconAtom2,
  'scale-free': IconChartDots,
  'small-world': IconTopologyStar3,
};

/** One icon per tool group (see `Tool.group`). */
export const TOOL_GROUP_ICONS: Readonly<Record<string, Icon>> = {
  Traversal: IconArrowsSplit2,
  Paths: IconRoute,
  Trails: IconRoute2,
  Structure: IconHierarchy2,
  Coloring: IconPalette,
  Trees: IconBinaryTree,
  'Flow and matching': IconArrowsRightLeft,
  'Centrality and communities': IconChartDots,
  'Cliques and planarity': IconCircles,
  Compare: IconEqual,
  Matrices: IconGrid3x3,
};

export const NO_TOOL_ICON: Icon = IconBan;

export const OPERATION_ICONS: Readonly<Record<string, Icon>> = {
  union: IconArrowMerge,
  intersection: IconArrowsJoin2,
  cartesian: IconGridDots,
  tensor: IconX,
  complement: IconCircleDot,
  transpose: IconSwitchHorizontal,
  'line-graph': IconTimeline,
  subgraph: IconCut,
  contract: IconAtom2,
  canonicalize: IconSortAscending,
  reindex: IconNumbers,
  relabel: IconReplace,
  'remove-loops': IconTrash,
};

export const FALLBACK_ICON: Icon = IconAbc;
