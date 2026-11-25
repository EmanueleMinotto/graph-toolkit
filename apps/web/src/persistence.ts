import { fromJson, toJson, type Graph } from 'graph-toolkit';

const STORAGE_KEY = 'graph-toolkit.graph';
const HASH_PREFIX = '#g=';
/** Longer links are not put in the address bar: they break in chat apps and some servers. */
const MAX_HASH_LENGTH = 6000;

function toBase64Url(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCodePoint(byte),
  ).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0));
}

/** URL fragment that reproduces `graph`; positions are not part of it. */
export const shareHash = (graph: Graph): string => `${HASH_PREFIX}${toBase64Url(toJson(graph))}`;

/** Link to this page showing `graph`. */
export const shareUrl = (graph: Graph, page: Pick<Location, 'origin' | 'pathname'>): string =>
  `${page.origin}${page.pathname}${shareHash(graph)}`;

function fromHash(hash: string): Graph | undefined {
  return hash.startsWith(HASH_PREFIX)
    ? fromJson(fromBase64Url(hash.slice(HASH_PREFIX.length)))
    : undefined;
}

/** Graph from the URL fragment, else the last saved one; `undefined` when neither is usable. */
export function loadGraph(hash: string, storage: Pick<Storage, 'getItem'>): Graph | undefined {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return fromHash(hash) ?? (stored === null ? undefined : fromJson(stored));
  } catch {
    return undefined;
  }
}

/** Base64 grows data by a third. */
const MAX_JSON_FOR_HASH = Math.floor((MAX_HASH_LENGTH * 3) / 4);

/** Remembers `graph` for the next visit and mirrors it in the address bar when short enough. */
export function saveGraph(
  graph: Graph,
  storage: Pick<Storage, 'setItem'>,
  address: Pick<History, 'replaceState'>,
): void {
  const json = toJson(graph);
  address.replaceState(null, '', json.length <= MAX_JSON_FOR_HASH ? shareHash(graph) : '#');
  try {
    storage.setItem(STORAGE_KEY, json);
  } catch {
    // Storage may be full or blocked (private mode); the link still works.
  }
}
