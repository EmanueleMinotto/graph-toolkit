import { GraphBuilder, vertexId, GraphError, type Graph } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  fromDimacs,
  fromPajek,
  fromSparse6,
  ParseError,
  toDimacs,
  toPajek,
  toSparse6,
} from './index.js';

const keys = (graph: Graph): string[] =>
  graph
    .edges()
    .map((edge) => [edge.source, edge.target].toSorted((a, b) => a.localeCompare(b)).join('-'))
    .toSorted((a, b) => a.localeCompare(b));

function everyGraph(count: number): Graph[] {
  const pairs = completeGraph(count)
    .edges()
    .map((edge) => [edge.source, edge.target] as const);
  return Array.from({ length: 2 ** pairs.length }, (_, mask) => {
    const builder = new GraphBuilder({ directed: false });
    for (let index = 0; index < count; index++) builder.addVertex(vertexId(String(index)));
    for (const [bit, [source, target]] of pairs.entries()) {
      if ((mask >> bit) & 1) builder.addEdge(source, target);
    }
    return builder.build();
  });
}

describe('Pajek', () => {
  it('round-trips names, weights and direction', () => {
    const builder = new GraphBuilder({ directed: true });
    builder
      .addVertex(vertexId('a b'))
      .addVertex(vertexId('c'))
      .addEdge(vertexId('a b'), vertexId('c'), 2.5);
    const graph = fromPajek(toPajek(builder.build()));
    expect(graph.directed).toBe(true);
    expect(graph.edges()).toEqual([{ source: 'a b', target: 'c', weight: 2.5 }]);
  });

  it('writes undirected graphs as *Edges', () => {
    expect(toPajek(pathGraph(2))).toContain('*Edges');
  });

  it('reads bare labels, comments and unweighted edges; ignores other sections', () => {
    const graph = fromPajek('% hi\n*Vertices 2\n1 x\n2\n*Edges\n1 2\n*Matrix\n0 1');
    expect(graph.vertices()).toEqual(['x', '2']);
    expect(graph.directed).toBe(false);
  });

  it('ignores lines before the first section', () => {
    expect(fromPajek('stray\n*Vertices 1\n1 "a"').vertices()).toEqual(['a']);
  });

  it('rejects malformed input', () => {
    expect(() => fromPajek('')).toThrow(ParseError);
    expect(() => fromPajek('*Vertices 1\nx\n')).toThrow(ParseError);
    expect(() => fromPajek('*Vertices 1\n1 "a"\n*Edges\n1 9')).toThrow(ParseError);
    expect(() => fromPajek('*Vertices 2\n1 "a"\n2 "b"\n*Edges\n1 2 heavy')).toThrow(ParseError);
  });
});

describe('DIMACS', () => {
  it('round-trips undirected and directed weighted graphs', () => {
    expect(keys(fromDimacs(toDimacs(cycleGraph(4))))).toEqual(['1-2', '1-4', '2-3', '3-4']);
    const builder = new GraphBuilder({ directed: true });
    builder
      .addVertex(vertexId('x'))
      .addVertex(vertexId('y'))
      .addEdge(vertexId('x'), vertexId('y'), 7);
    const back = fromDimacs(toDimacs(builder.build()));
    expect(back.directed).toBe(true);
    expect(back.edges()).toEqual([{ source: '1', target: '2', weight: 7 }]);
  });

  it('skips comments and keeps isolated vertices', () => {
    const graph = fromDimacs('c hello\np edge 3 1\ne 1 2\n');
    expect(graph.vertexCount).toBe(3);
  });

  it('rejects bad headers and bad lines', () => {
    expect(() => fromDimacs('e 1 2')).toThrow(ParseError);
    expect(() => fromDimacs('p edge x 1')).toThrow(ParseError);
    expect(() => fromDimacs('p edge 2 1\ne 1 5')).toThrow(ParseError);
    expect(() => fromDimacs('p edge 2 1\ne 1 2 heavy')).toThrow(ParseError);
  });
});

describe('sparse6', () => {
  it('round-trips every graph on up to 5 vertices', () => {
    for (const count of [1, 2, 3, 4, 5]) {
      for (const graph of everyGraph(count)) {
        const back = fromSparse6(toSparse6(graph));
        expect(back.vertexCount).toBe(count);
        expect(keys(back)).toEqual(keys(graph));
      }
    }
  });

  it('accepts edges given high-to-low', () => {
    const builder = new GraphBuilder({ directed: false });
    for (const name of ['0', '1', '2']) builder.addVertex(vertexId(name));
    builder.addEdge(vertexId('2'), vertexId('0')).addEdge(vertexId('2'), vertexId('1'));
    expect(keys(fromSparse6(toSparse6(builder.build())))).toEqual(['0-2', '1-2']);
  });

  it('round-trips larger sparse graphs and accepts the header', () => {
    const graph = pathGraph(70);
    expect(keys(fromSparse6(`>>sparse6<<${toSparse6(graph)}\n`))).toEqual(keys(graph));
    expect(toSparse6(pathGraph(0))).toBe(':?');
  });

  it('rejects directed graphs, loops and bad text', () => {
    expect(() => toSparse6(pathGraph(3, { directed: true }))).toThrow(GraphError);
    const loop = new GraphBuilder({ directed: false });
    loop.addVertex(vertexId('0')).addEdge(vertexId('0'), vertexId('0'));
    expect(() => toSparse6(loop.build())).toThrow(GraphError);
    expect(() => fromSparse6('A_')).toThrow(ParseError);
  });
});
