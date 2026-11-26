import { ParseError } from '../errors.js';

const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeXml(text: string): string {
  return text.replaceAll(/[&<>"]/gu, (char) => ENTITIES[char]!);
}

export function unescapeXml(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}

export interface XmlElement {
  readonly attributes: ReadonlyMap<string, string>;
  /** Raw inner markup, empty for self-closing elements. */
  readonly body: string;
}

/** Parses `name="value"` pairs by splitting on quotes (linear, no regex backtracking). */
function parseAttributes(text: string): Map<string, string> {
  const parts = text.split('"');
  const attributes = new Map<string, string>();
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const name = parts[index]!.trimEnd().slice(0, -1).trimEnd().split(/\s+/u).pop()!;
    attributes.set(name, unescapeXml(parts[index + 1]!));
  }
  return attributes;
}

const isTagBoundary = (char: string | undefined): boolean =>
  char !== undefined && /[\s/>]/u.test(char);

function readElement(xml: string, tag: string, start: number): XmlElement | undefined {
  const end = xml.indexOf('>', start);
  if (end === -1) {
    return undefined;
  }
  const nameEnd = start + tag.length + 1;
  const isSelfClosing = xml[end - 1] === '/';
  const attributes = parseAttributes(xml.slice(nameEnd, isSelfClosing ? end - 1 : end));
  const close = isSelfClosing ? -1 : xml.indexOf(`</${tag}>`, end);
  return { attributes, body: close === -1 ? '' : xml.slice(end + 1, close) };
}

/** Finds every `<tag …/>` or `<tag …>…</tag>` (flat, non-nested use only). */
export function findElements(xml: string, tag: string): XmlElement[] {
  const elements: XmlElement[] = [];
  const open = `<${tag}`;
  for (let from = xml.indexOf(open); from !== -1; from = xml.indexOf(open, from + 1)) {
    if (!isTagBoundary(xml[from + open.length])) {
      continue;
    }
    const element = readElement(xml, tag, from);
    if (element !== undefined) {
      elements.push(element);
    }
  }
  return elements;
}

/** Value of a mandatory attribute or a {@link ParseError} naming the element. */
export function requireAttribute(element: XmlElement, name: string, tag: string): string {
  const value = element.attributes.get(name);
  if (value === undefined) {
    throw new ParseError(`<${tag}> without "${name}"`);
  }
  return value;
}
