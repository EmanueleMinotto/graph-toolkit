import { type Graph } from 'graph-toolkit';
import { type Choice } from './ChoiceSelect.js';
import { type AnalysisKind } from './analysis.js';
import { FORMATS, SAMPLES, type Format, type SampleKind } from './formats.js';
import {
  FALLBACK_ICON,
  FORMAT_ICONS,
  LAYOUT_ICONS,
  NO_TOOL_ICON,
  OPERATION_ICONS,
  SAMPLE_ICONS,
  TOOL_GROUP_ICONS,
} from './icons.js';
import { LAYOUTS, type LayoutKind } from './layouts.js';
import { OPERATIONS, type OperationKind } from './operations.js';
import { TOOLS, unavailableReason } from './tools.js';

const FORMAT_LABELS: Readonly<Record<Format, string>> = {
  json: 'JSON',
  'edge-list': 'Edge list',
  dot: 'DOT',
  graphml: 'GraphML',
  gexf: 'GEXF',
  'adjacency-csv': 'Adjacency CSV',
  mermaid: 'Mermaid',
  prufer: 'Prüfer code',
};

const LAYOUT_LABELS: Readonly<Record<LayoutKind, string>> = {
  force: 'Force-directed',
  circular: 'Circular',
  grid: 'Grid',
  layered: 'Layered',
};

const SAMPLE_LABELS: Readonly<Record<SampleKind, string>> = {
  path: 'Path',
  cycle: 'Cycle',
  complete: 'Complete',
  grid: 'Grid',
  star: 'Star',
  random: 'Random',
};

const icon = (icons: Readonly<Record<string, Choice<string>['icon']>>, id: string) =>
  icons[id] ?? FALLBACK_ICON;

export const FORMAT_CHOICES: readonly Choice<Format>[] = FORMATS.map((value) => ({
  value,
  label: FORMAT_LABELS[value],
  icon: icon(FORMAT_ICONS, value),
}));

export const LAYOUT_CHOICES: readonly Choice<LayoutKind>[] = LAYOUTS.map((value) => ({
  value,
  label: LAYOUT_LABELS[value],
  icon: icon(LAYOUT_ICONS, value),
}));

export const SAMPLE_CHOICES: readonly Choice<SampleKind>[] = SAMPLES.map((value) => ({
  value,
  label: SAMPLE_LABELS[value],
  icon: icon(SAMPLE_ICONS, value),
}));

export const OPERATION_CHOICES: readonly Choice<OperationKind>[] = OPERATIONS.map((operation) => ({
  value: operation.id,
  label: operation.label,
  group: operation.group,
  icon: icon(OPERATION_ICONS, operation.id),
}));

/** Analysis tools grouped by `Tool.group`; tools the graph cannot run are disabled with the reason. */
export function toolChoices(graph: Graph): readonly Choice<AnalysisKind>[] {
  return TOOLS.map((tool) => {
    const reason = unavailableReason(tool, graph);
    return {
      value: tool.id,
      label: reason === undefined ? tool.label : `${tool.label} (${reason})`,
      group: tool.group,
      disabled: reason !== undefined,
      icon: tool.group === undefined ? NO_TOOL_ICON : icon(TOOL_GROUP_ICONS, tool.group),
    };
  });
}
