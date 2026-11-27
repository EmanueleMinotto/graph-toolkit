import type { ParsedEdge } from './assemble.js';

const ID = /"(?:[^"\\]|\\.)*"|[A-Za-z_]\w*|-?\d+(?:\.\d+)?/gu;
const WEIGHT = /\bweight\s*=\s*"?(-?\d+(?:\.\d+)?)/u;

export const unquote = (token: string): string =>
  token.startsWith('"') ? token.slice(1, -1).replaceAll(/\\(.)/gu, '$1') : token;

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

const QUOTED_OR_COMMENT = /"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|(?:\/\/|#).*/gu;
const MASKED = /"@(\d+)"/gu;

/** Source with comments dropped and every quoted string replaced by an opaque `"@<index>"` token. */
export interface MaskedDot {
  readonly text: string;
  readonly strings: readonly string[];
}

/** One left-to-right scan, so `#`, `//`, `;`, `=`, `[` or a newline inside quotes are never mistaken for syntax. */
export function maskStrings(source: string): MaskedDot {
  const strings: string[] = [];
  const text = source.replaceAll(QUOTED_OR_COMMENT, (match) => {
    if (!match.startsWith('"')) {
      return '';
    }

    strings.push(match);

    return `"@${strings.length - 1}"`;
  });

  return { text, strings };
}

/** Puts the original quoted strings back (still quoted). */
export const unmask = (text: string, strings: readonly string[]): string =>
  text.replaceAll(MASKED, (_, index: string) => strings[Number(index)]!);

/** Name of a masked identifier: the unquoted original string, or the bare token itself. */
export const nameOf = (id: string, strings: readonly string[]): string =>
  id.startsWith('@') ? unquote(strings[Number(id.slice(1))]!) : id;
