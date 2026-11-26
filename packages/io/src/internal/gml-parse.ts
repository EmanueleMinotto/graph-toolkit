import { ParseError } from '../errors.js';

export type GmlValue = string | number | GmlList;
export type GmlList = readonly (readonly [string, GmlValue])[];

const TOKEN = /"[^"]*"|\[|\]|[^\s[\]"]+/gu;

const unescape = (text: string): string => text.replaceAll('&quot;', '"').replaceAll('&amp;', '&');

// eslint-disable-next-line sonarjs/function-return-type -- GML scalars are strings or numbers
function scalar(token: string): string | number {
  if (token.startsWith('"')) return unescape(token.slice(1, -1));
  return Number.isNaN(Number(token)) ? token : Number(token);
}

interface Cursor {
  readonly tokens: readonly string[];
  index: number;
}

function parseEntry(cursor: Cursor): readonly [string, GmlValue] {
  const key = cursor.tokens[cursor.index++]!;
  const raw = cursor.tokens[cursor.index++];
  if (raw === undefined || raw === ']') throw new ParseError(`Missing value for "${key}"`);
  if (raw !== '[') return [key, scalar(raw)];
  const nested = parseList(cursor);
  if (cursor.tokens[cursor.index++] !== ']') throw new ParseError('Unclosed "["');
  return [key, nested];
}

function parseList(cursor: Cursor): GmlList {
  const entries: (readonly [string, GmlValue])[] = [];
  while (cursor.index < cursor.tokens.length && cursor.tokens[cursor.index] !== ']') {
    entries.push(parseEntry(cursor));
  }
  return entries;
}

/** Parses GML text into nested key/value lists. */
export function parseGml(text: string): GmlList {
  const cursor: Cursor = { tokens: text.match(TOKEN) ?? [], index: 0 };
  const list = parseList(cursor);
  if (cursor.index < cursor.tokens.length) throw new ParseError('Unexpected "]"');
  return list;
}

/** First value stored under `key`. */
export const valueOf = (list: GmlList, key: string): GmlValue | undefined =>
  list.find(([name]) => name === key)?.[1];

/** All lists stored under `key`. */
export const listsOf = (list: GmlList, key: string): readonly GmlList[] =>
  list.flatMap(([name, value]) => (name === key && typeof value === 'object' ? [value] : []));
