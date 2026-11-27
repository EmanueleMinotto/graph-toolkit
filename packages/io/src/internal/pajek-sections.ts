export interface Sections {
  readonly directed: boolean;
  /** Whether a `*Vertices` header is present (it may announce zero vertices). */
  readonly hasVertexSection: boolean;
  /** Lines of the `*Vertices` section (after the header). */
  readonly vertices: readonly string[];
  /** Lines of the `*Edges` and `*Arcs` sections. */
  readonly rows: readonly string[];
}

const withoutComment = (line: string): string => line.replace(/%.*/u, '').trim();

/** Splits a Pajek document into its vertex and edge lines; `%` starts a comment. */
export function splitSections(text: string): Sections {
  const lines = text.split('\n').map((line) => withoutComment(line));
  const headers = lines.map((line) =>
    line.startsWith('*') ? line.split(/\s+/u, 1)[0]!.toLowerCase() : '',
  );
  const sectionOf = (index: number): string =>
    headers.slice(0, index + 1).findLast((name) => name !== '') ?? '';
  const inSection = (names: readonly string[]): string[] =>
    lines.filter(
      (line, index) => line !== '' && headers[index] === '' && names.includes(sectionOf(index)),
    );

  return {
    directed: headers.includes('*arcs'),
    hasVertexSection: headers.includes('*vertices'),
    vertices: inSection(['*vertices']),
    rows: inSection(['*edges', '*arcs']),
  };
}
