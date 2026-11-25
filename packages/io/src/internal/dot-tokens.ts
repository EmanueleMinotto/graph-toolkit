import type { ParsedEdge } from './assemble.js';

const ID = /"(?:[^"\\]|\\.)*"|[A-Za-z_]\w*|-?\d+(?:\.\d+)?/g;
const WEIGHT = /\bweight\s*=\s*"?(-?\d+(?:\.\d+)?)/;

const unquote = (token: string): string =>
  token.startsWith('"') ? token.slice(1, -1).replaceAll(/\\(.)/g, '$1') : token;

/** Identifiers (quoted, bare or numeric) in order of appearance. */
export function idsOf(text: string): readonly string[] {
  return [...text.matchAll(ID)].map((match) => unquote(match[0]));
}

export function weightOf(attributes: string): number {
  const match = WEIGHT.exec(attributes);
  return match === null ? 1 : Number(match[1]);
}

/** `a -> b -> c` becomes edges a→b and b→c. */
export function chainEdges(names: readonly string[], weight: number): readonly ParsedEdge[] {
  return names.slice(1).map((target, index) => ({ source: names[index]!, target, weight }));
}

/** Splits `head [attributes]` at the first `[`. */
export function splitAttributes(statement: string): readonly [head: string, attributes: string] {
  const bracket = statement.indexOf('[');
  return bracket === -1 ? [statement, ''] : [statement.slice(0, bracket), statement.slice(bracket)];
}
