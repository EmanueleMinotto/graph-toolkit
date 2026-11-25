import { DuplicateError, GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  fromAdjacencyCsv,
  fromDot,
  fromEdgeList,
  fromGexf,
  fromGraphMl,
  fromJson,
  ParseError,
  toAdjacencyCsv,
  toDot,
  toEdgeList,
  toGexf,
  toGraphMl,
  toJson,
  toMermaid,
} from './index.js';

const [a, b, c] = [vertexId('a'), vertexId('b "q" & <c>'), vertexId('c')] as const;

const sample = (directed: boolean): Graph =>
  new GraphBuilder({ directed })
    .addVertex(a)
    .addVertex(b)
    .addVertex(c)
    .addEdge(a, b, 2.5)
    .addEdge(b, a === c ? a : c)
    .build();

const byName = (left: string, right: string) => left.localeCompare(right);

const shape = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges(),
});

describe.each([false, true])('round trips (directed=%s)', (directed) => {
  const graph = sample(directed);

  it('json', () => {
    expect(shape(fromJson(toJson(graph)))).toEqual(shape(graph));
  });

  it('graphml', () => {
    expect(shape(fromGraphMl(toGraphMl(graph)))).toEqual(shape(graph));
  });

  it('gexf', () => {
    expect(shape(fromGexf(toGexf(graph)))).toEqual(shape(graph));
  });

  it('dot', () => {
    expect(shape(fromDot(toDot(graph)))).toEqual(shape(graph));
  });

  it('edge list keeps connected vertices', () => {
    const plain = cycleGraph(4, { directed });
    const parsed = fromEdgeList(toEdgeList(plain), { isDirected: directed });
    expect(parsed.directed).toBe(directed);
    expect(parsed.vertices().toSorted(byName)).toEqual(plain.vertices().toSorted(byName));
    expect(parsed.edgeCount).toBe(plain.edgeCount);
  });
});

describe('json', () => {
  it('defaults weights and rejects malformed documents', () => {
    const graph = fromJson(
      '{"directed":false,"vertices":["x"],"edges":[{"source":"x","target":"y"}]}',
    );
    expect(graph.edges()[0]?.weight).toBe(1);
    expect(() => fromJson('{"directed":1}')).toThrow(ParseError);
    expect(() => fromJson('{"directed":true,"vertices":[],"edges":[{"source":1}]}')).toThrow(
      ParseError,
    );
  });
});

describe('edge list', () => {
  it('parses comments, spaces and optional weights', () => {
    const graph = fromEdgeList('# header\na b\nb,c,4 # tail\n\n');
    expect(graph.edgeCount).toBe(2);
    expect(graph.edges().map((edge) => edge.weight)).toEqual([1, 4]);
  });

  it('rejects malformed lines and duplicates', () => {
    expect(() => fromEdgeList('a')).toThrow(ParseError);
    expect(() => fromEdgeList('a b x')).toThrow(ParseError);
    expect(() => fromEdgeList('a b 1 2')).toThrow(ParseError);
    expect(() => fromEdgeList('a b\nb a')).toThrow(DuplicateError);
  });
});

describe('dot', () => {
  it('parses comments, bare nodes, chains and quoted ids', () => {
    const graph = fromDot(
      'strict digraph G { /* c */ rankdir=LR; x; "y z" -> x -> w [weight="3"] // end\n}',
    );
    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['x', 'y z', 'w']);
    expect(graph.edgeCount).toBe(2);
  });

  it('rejects bad input', () => {
    expect(() => fromDot('nope')).toThrow(ParseError);
    expect(() => fromDot('graph { subgraph s { a } }')).toThrow(ParseError);
    expect(fromDot('graph { a -> b }').edgeCount).toBe(0);
    expect(fromDot('digraph { a -> b }').edges()[0]?.weight).toBe(1);
  });
});

describe('xml formats', () => {
  it('require a graph element and edge endpoints', () => {
    expect(() => fromGraphMl('<x/>')).toThrow(ParseError);
    expect(() => fromGexf('<x/>')).toThrow(ParseError);
    expect(() => fromGraphMl('<graph><edge source="a"/></graph>')).toThrow(ParseError);
    expect(() => fromGexf('<graph><edge target="a"/></graph>')).toThrow(ParseError);
  });

  it('reject nodes without ids and ignore unterminated tags', () => {
    expect(() => fromGraphMl('<graph><node/></graph>')).toThrow(ParseError);
    expect(fromGexf('<graph><edge source="a" target="b"').edgeCount).toBe(0);
  });

  it('default missing weights to 1', () => {
    expect(fromGraphMl('<graph><edge source="a" target="b"/></graph>').edges()[0]?.weight).toBe(1);
    expect(fromGexf('<graph><edge source="a" target="b"/></graph>').edges()[0]?.weight).toBe(1);
  });
});

describe('mermaid and adjacency csv', () => {
  it('exports mermaid flowcharts', () => {
    const text = toMermaid(pathGraph(2, { directed: true }));
    expect(text).toContain('n0 -->|1| n1');
    expect(toMermaid(sample(false))).toContain('---');
    expect(toMermaid(sample(false))).toContain('#quot;');
  });

  it('round trips adjacency csv and rejects bad cells', () => {
    const cycle = cycleGraph(4);
    expect(toAdjacencyCsv(fromAdjacencyCsv(toAdjacencyCsv(cycle)))).toBe(toAdjacencyCsv(cycle));
    expect(fromAdjacencyCsv('0,1\n0,0', { isDirected: true }).directed).toBe(true);
    expect(() => fromAdjacencyCsv('0,x\nx,0')).toThrow(ParseError);
  });
});
