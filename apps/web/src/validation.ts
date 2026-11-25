import { validateGraph, type Graph, type GraphSchema, type ValidationIssue } from 'graph-toolkit';

export type Direction = 'any' | 'undirected' | 'directed';

/** Form state: `''` means "no limit" for the numeric fields. */
export interface ValidationForm {
  readonly direction: Direction;
  readonly allowSelfLoops: boolean;
  readonly allowIsolated: boolean;
  readonly connected: boolean;
  readonly maxVertices: number | '';
  readonly maxEdges: number | '';
  readonly pattern: string;
  readonly minWeight: number | '';
  readonly maxWeight: number | '';
  readonly isInteger: boolean;
}

export const DEFAULT_FORM: ValidationForm = {
  direction: 'any',
  allowSelfLoops: true,
  allowIsolated: true,
  connected: false,
  maxVertices: '',
  maxEdges: '',
  pattern: '',
  minWeight: '',
  maxWeight: '',
  isInteger: false,
};

const limit = (value: number | ''): number | undefined => (value === '' ? undefined : value);

/** Turns the form into a schema; an invalid pattern throws a `SyntaxError`. */
export const buildSchema = (form: ValidationForm): GraphSchema => ({
  directed: form.direction === 'any' ? undefined : form.direction === 'directed',
  allowSelfLoops: form.allowSelfLoops,
  allowIsolated: form.allowIsolated,
  connected: form.connected,
  maxVertices: limit(form.maxVertices),
  maxEdges: limit(form.maxEdges),
  vertexIdPattern: form.pattern === '' ? undefined : new RegExp(form.pattern, 'u'),
  weight: { min: limit(form.minWeight), max: limit(form.maxWeight), isInteger: form.isInteger },
});

export const validate = (graph: Graph, form: ValidationForm): readonly ValidationIssue[] =>
  validateGraph(graph, buildSchema(form));
