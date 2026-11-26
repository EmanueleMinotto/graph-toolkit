export interface NodeToken {
  readonly key: string;
  readonly label: string | undefined;
}

const BRACKET = /[[(]/u;

/** `n0["x y"]`, `n0(label)`, `n0` → key and optional label. */
export function parseNode(text: string): NodeToken {
  const trimmed = text.trim();
  const open = trimmed.search(BRACKET);
  if (open === -1) return { key: trimmed, label: undefined };
  const body = trimmed.slice(open);
  const quote = body.indexOf('"');
  const raw =
    quote === -1 ? body.replaceAll(/[()[\]]/gu, '') : body.slice(quote + 1, body.lastIndexOf('"'));
  return { key: trimmed.slice(0, open), label: raw.replaceAll('#quot;', '"') };
}

export interface EdgeToken {
  readonly left: NodeToken;
  readonly right: NodeToken;
  readonly weight: number;
  readonly isDirected: boolean;
}

function weightOf(rest: string): { weight: number; remainder: string } {
  const close = rest.startsWith('|') ? rest.indexOf('|', 1) : -1;
  if (close === -1) return { weight: 1, remainder: rest };
  const weight = Number(rest.slice(1, close));
  return { weight: Number.isFinite(weight) ? weight : 1, remainder: rest.slice(close + 1) };
}

/** `a --> b`, `a ---|3| b`; `undefined` when the line has no arrow. */
export function parseEdge(line: string): EdgeToken | undefined {
  const directedAt = line.indexOf('-->');
  const undirectedAt = line.indexOf('---');
  const at = directedAt === -1 ? undirectedAt : directedAt;
  if (at === -1) return undefined;
  const { weight, remainder } = weightOf(line.slice(at + 3).trim());
  return {
    left: parseNode(line.slice(0, at)),
    right: parseNode(remainder),
    weight,
    isDirected: directedAt !== -1,
  };
}
