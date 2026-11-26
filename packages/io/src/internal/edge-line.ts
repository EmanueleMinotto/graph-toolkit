import { ParseError } from '../errors.js';
import type { ParsedEdge } from './assemble.js';

function toEdge(line: string): ParsedEdge {
  const [source, target, weight, ...extra] = line.split(/[\s,]+/u);
  const parsedWeight = weight === undefined ? 1 : Number(weight);

  if (
    source === undefined ||
    target === undefined ||
    extra.length > 0 ||
    !Number.isFinite(parsedWeight)
  ) {
    throw new ParseError(`Invalid edge line: ${line}`);
  }

  return { source, target, weight: parsedWeight };
}

/** `source target [weight]` separated by commas or whitespace; `#` starts a comment. Blank lines give `undefined`. */
export function parseEdgeLine(raw: string): ParsedEdge | undefined {
  const line = raw.replace(/#.*/u, '').trim();

  return line === '' ? undefined : toEdge(line);
}

/** Parses every edge line of text that arrives in chunks. */
export async function collectEdges(
  chunks: AsyncIterable<string> | Iterable<string>,
): Promise<ParsedEdge[]> {
  const edges: ParsedEdge[] = [];

  for await (const line of linesOf(chunks)) {
    const edge = parseEdgeLine(line);

    if (edge !== undefined) {
      edges.push(edge);
    }
  }

  return edges;
}

/** Splits text arriving in arbitrary chunks into lines, without ever holding more than one line. */
export async function* linesOf(
  chunks: AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<string> {
  let pending = '';

  for await (const chunk of chunks) {
    const parts = (pending + chunk).split('\n');

    pending = parts.pop()!;
    yield* parts;
  }

  yield pending;
}
