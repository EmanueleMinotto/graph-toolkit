import { describe, expect, it } from 'vitest';
import { FORMATS, run } from './index.js';

const exec = (argv: readonly string[], input = ''): { code: number; out: string; err: string } => {
  const seen = { out: '', err: '' };
  const code = run(argv, {
    readInput: () => input,
    out: (text) => {
      seen.out += text;
    },
    err: (text) => {
      seen.err += text;
    },
  });

  return { code, ...seen };
};

const parsed = (text: string): unknown => JSON.parse(text);

describe('graph-toolkit cli', () => {
  it('converts between formats', () => {
    const result = exec(['convert', '--from', 'edgelist', '--to', 'dot'], 'a,b,1\nb,c,1\n');

    expect(result.code).toBe(0);
    expect(result.out).toContain('"a" -- "b"');
    expect(result.out.endsWith('\n')).toBe(true);
  });

  it('generates a graph in the requested format', () => {
    const result = exec(['generate', 'cycle', '4', '--to', 'edgelist']);

    expect(result.out.trim().split('\n')).toHaveLength(4);

    expect(exec(['generate', 'path', '3', '--to', 'edgelist', '--directed']).out).toBe(
      '0,1,1\n1,2,1\n',
    );
  });

  it('generates a seeded random graph deterministically', () => {
    const commandLine = [
      'generate',
      'random',
      '20',
      '--to',
      'graph6',
      '--probability',
      '0.3',
      '--seed',
      '5',
    ];

    expect(exec(commandLine).out).toBe(exec(commandLine).out);
  });

  it('prints statistics for undirected and directed graphs', () => {
    const undirected = parsed(exec(['info', '--from', 'edgelist'], 'a,b,1\nc,d,1\n').out);
    const directed = parsed(exec(['info', '--from', 'dot'], 'digraph { a -> b; b -> a; }').out);
    const empty = parsed(
      exec(['info', '--from', 'json'], '{"directed":false,"vertices":[],"edges":[]}').out,
    );

    expect(undirected).toEqual({
      directed: false,
      vertices: 4,
      edges: 2,
      components: 2,
      density: 1 / 3,
    });

    expect(directed).toMatchObject({ directed: true, vertices: 2, components: 1, density: 1 });
    expect(empty).toMatchObject({ vertices: 0, density: 0 });
  });

  it('fails with a message on bad usage, formats and input', () => {
    expect(exec([]).err).toContain('Usage:');
    expect(exec(['generate']).err).toContain('Usage:');
    expect(exec(['generate', 'constructor', '3', '--to', 'dot']).err).toContain('Usage:');
    expect(exec(['convert', '--from', 'constructor', '--to', 'dot']).code).toBe(1);
    expect(exec(['generate', 'blob', '3', '--to', 'dot']).code).toBe(1);

    expect(exec(['convert', '--from', 'nope', '--to', 'dot']).err).toContain(
      '--from must be one of',
    );

    expect(exec(['convert', '--from', 'dot']).err).toContain('--to must be one of');
    expect(exec(['convert', '--from', 'json', '--to', 'dot'], 'not json').code).toBe(1);
  });

  it('reports non-error throwables', () => {
    const seen = { err: '' };
    const code = run(['info', '--from', 'json'], {
      readInput: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a non-Error throwable
        throw 'boom';
      },
      out: (): void => undefined,
      err: (text) => {
        seen.err += text;
      },
    });

    expect(code).toBe(1);
    expect(seen.err).toBe('boom\n');
  });

  it.each(['path', 'cycle', 'complete', 'star', 'wheel', 'binary-tree', 'hypercube', 'random'])(
    'generates %s graphs',
    (kind) => {
      expect(exec(['generate', kind, '4', '--to', 'json']).code).toBe(0);
    },
  );

  it.each(Object.keys(FORMATS))('round-trips a cycle through %s', (format) => {
    const json = exec(['generate', 'cycle', '4', '--to', 'json']).out;
    const text = exec(['convert', '--from', 'json', '--to', format], json).out;
    const stats = parsed(exec(['info', '--from', format], text).out);

    expect(stats).toMatchObject({ vertices: 4, edges: 4 });
  });
});
