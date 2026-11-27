import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import {
  fromAdjacencyCsv,
  fromDimacs,
  fromDot,
  fromGexf,
  fromGml,
  fromGraphMl,
  fromMermaid,
  fromPajek,
  toAdjacencyCsv,
  toDimacs,
  toDot,
  toEdgeListLines,
  toGexf,
  toGml,
  toGraphMl,
  toPajek,
} from './index.js';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')] as const;

const pair = (directed = false): Graph =>
  new GraphBuilder({ directed }).addVertex(a).addVertex(b).addEdge(a, b, 2).build();

const edgesOf = (graph: Graph): string[] =>
  graph.edges().map((edge) => `${edge.source}>${edge.target}:${edge.weight}`);

describe('writers', () => {
  it('writes DOT', () => {
    expect(toDot(pair())).toBe('graph {\n  "a";\n  "b";\n  "a" -- "b" [weight=2];\n}\n');
    expect(toDot(pair(true))).toBe('digraph {\n  "a";\n  "b";\n  "a" -> "b" [weight=2];\n}\n');

    const odd = new GraphBuilder().addVertex(vertexId('x"y\\z')).build();

    expect(toDot(odd)).toContain('"x\\"y\\\\z"');
  });

  it('writes GEXF', () => {
    expect(toGexf(pair())).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gexf xmlns="http://gexf.net/1.3" version="1.3">',
        '  <graph defaultedgetype="undirected">',
        '    <nodes>',
        '      <node id="a" label="a"/>',
        '      <node id="b" label="b"/>',
        '    </nodes>',
        '    <edges>',
        '      <edge id="0" source="a" target="b" weight="2"/>',
        '    </edges>',
        '  </graph>',
        '</gexf>',
        '',
      ].join('\n'),
    );

    expect(toGexf(pair(true))).toContain('defaultedgetype="directed"');
  });

  it('writes GraphML', () => {
    expect(toGraphMl(pair(true))).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
        '  <key id="d0" for="edge" attr.name="weight" attr.type="double"/>',
        '  <graph id="G" edgedefault="directed">',
        '    <node id="a"/>',
        '    <node id="b"/>',
        '    <edge source="a" target="b"><data key="d0">2</data></edge>',
        '  </graph>',
        '</graphml>',
        '',
      ].join('\n'),
    );

    expect(toGraphMl(pair())).toContain('edgedefault="undirected"');
  });

  it('writes GML, DIMACS, Pajek and CSV', () => {
    expect(toGml(pair())).toBe(
      'graph [\n  directed 0\n  node [ id 0 label "a" ]\n  node [ id 1 label "b" ]\n  edge [ source 0 target 1 weight 2 ]\n]\n',
    );

    expect(toDimacs(pair())).toBe('p edge 2 1\ne 1 2 2\n');
    expect(toDimacs(pair(true))).toBe('p sp 2 1\na 1 2 2\n');
    expect(toPajek(pair())).toBe('*Vertices 2\n1 "a"\n2 "b"\n*Edges\n1 2 2\n');
    expect(toPajek(pair(true))).toContain('*Arcs');
    expect(toPajek(new GraphBuilder().addVertex(vertexId('q"r')).build())).toContain('1 "q\'r"');
    expect(toAdjacencyCsv(pair())).toBe('0,2\n2,0');
  });

  it('lists a self-loop once and every edge under its lower endpoint', () => {
    const graph = new GraphBuilder()
      .addVertex(a)
      .addVertex(b)
      .addEdge(a, a)
      .addEdge(a, b)
      .addEdge(b, b)
      .build();

    expect([...toEdgeListLines(graph)]).toEqual(['a,a,1', 'a,b,1', 'b,b,1']);
  });
});

describe('parse errors', () => {
  it('words DIMACS problems and validates its numbers', () => {
    expect(() => fromDimacs('c nothing\n')).toThrow(
      'DIMACS document needs a "p <kind> <vertices> <edges>" line',
    );

    expect(() => fromDimacs('p edge -1 0\n')).toThrow('needs a "p');
    expect(() => fromDimacs('p edge 2 1\ne 1 9\n')).toThrow('Invalid DIMACS line: e 1 9');
    expect(() => fromDimacs('p edge 2 1\ne 1 0\n')).toThrow('Invalid DIMACS line: e 1 0');
    expect(() => fromDimacs('p edge 2 1\ne 0 1\n')).toThrow('Invalid DIMACS line');
    expect(() => fromDimacs('p edge 2 1\ne 1 2 x\n')).toThrow('Invalid DIMACS line');
    expect(fromDimacs('p edge 0 0\n').vertexCount).toBe(0);
  });

  it('reads DIMACS regardless of spacing, comments and kind', () => {
    const graph = fromDimacs('c e 1 2\n  p   sp   3  2  \n a  1   2   5\n\na 2 3\n');

    expect(graph.directed).toBe(true);
    expect(edgesOf(graph)).toEqual(['1>2:5', '2>3:1']);
    expect(fromDimacs('p edge 2 1\ne 1 2\n').directed).toBe(false);
  });

  it('words XML-based format problems', () => {
    expect(() => fromGexf('<gexf/>')).toThrow('Missing <graph> element');
    expect(() => fromGraphMl('<graphml/>')).toThrow('Missing <graph> element');
    expect(() => fromGexf('<graph><node/></graph>')).toThrow('<node> without "id"');
    expect(() => fromGraphMl('<graph><node/></graph>')).toThrow('<node> without "id"');
    expect(() => fromGexf('<graph><edge target="a"/></graph>')).toThrow('<edge> without "source"');
    expect(() => fromGexf('<graph><edge source="a"/></graph>')).toThrow('<edge> without "target"');

    expect(() => fromGraphMl('<graph><edge target="a"/></graph>')).toThrow(
      '<edge> without "source"',
    );

    expect(() => fromGraphMl('<graph><edge source="a"/></graph>')).toThrow(
      '<edge> without "target"',
    );
  });

  it('reads XML with free spacing, bodies and defaults', () => {
    const gexf = fromGexf(
      '<graph defaultedgetype="directed">\n<node\n  id="a"   label="x" />\n<node id="b"></node>\n<edge  source="a"\ttarget="b" weight="4"/>\n<edge source="b" target="a"/></graph>',
    );

    expect(gexf.directed).toBe(true);
    expect(gexf.vertices()).toEqual(['a', 'b']);
    expect(edgesOf(gexf)).toEqual(['a>b:4', 'b>a:1']);

    const ml = fromGraphMl(
      '<graph edgedefault="directed"><node id="a"/><node id="b"/><edge source="a" target="b"><data key="d0">3.5</data></edge><edge source="b" target="a"></edge></graph>',
    );

    expect(edgesOf(ml)).toEqual(['a>b:3.5', 'b>a:1']);
    expect(fromGraphMl('<graph><node id="a"/></graph>').directed).toBe(false);
  });

  it('words GML problems', () => {
    expect(() => fromGml('graph [ node [ label "a" ] ]')).toThrow('GML node without numeric id');

    expect(() => fromGml('graph [ node [ id 0 ] edge [ source 0 target 5 ] ]')).toThrow(
      'GML edge with unknown node',
    );

    expect(() => fromGml('')).toThrow('GML document has no graph');
    expect(() => fromGml('graph [ directed')).toThrow('Missing value for "directed"');
    expect(() => fromGml('graph [ directed ]')).toThrow('Missing value for "directed"');
    expect(() => fromGml('graph [ node [ id 0')).toThrow('Unclosed "["');
    expect(() => fromGml('graph [ id 0 ] ]')).toThrow('Unexpected "]"');
  });

  it('words Pajek and CSV problems', () => {
    expect(() => fromPajek('')).toThrow('Pajek document has no vertices');
    expect(() => fromPajek('*Vertices 1\nfoo\n*Edges\n')).toThrow('Invalid Pajek vertex line: foo');

    expect(() => fromPajek('*Vertices 1\n1 "a"\n*Edges\n1 9\n')).toThrow(
      'Pajek edge with unknown vertex: 1 9',
    );

    expect(() => fromPajek('*Vertices 2\n1 "a"\n2 "b"\n*Edges\n1 2 x\n')).toThrow(
      'Invalid Pajek weight: 1 2 x',
    );

    expect(() => fromAdjacencyCsv('0,x\n1,0')).toThrow('Adjacency CSV contains a non-numeric cell');
    expect(() => fromAdjacencyCsv('0,1\n1,x')).toThrow('non-numeric');
  });

  it('reads Pajek with comments, sections and spacing', () => {
    const graph = fromPajek(
      '% header\n*Vertices 3\n 1   "a" % first\n2 b\n3\n*Arcs\n 1   2   7 % arc\n*Edgeslist\n1 2 3\n',
    );

    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['a', 'b', '3']);
    expect(edgesOf(graph)).toEqual(['a>b:7']);
  });

  it('reads padded CSV rows', () => {
    const graph = fromAdjacencyCsv(' 0,1 \n\n 1,0 \n');

    expect(graph.vertexCount).toBe(2);
    expect(graph.edgeCount).toBe(1);
  });

  it('words DOT and Mermaid problems', () => {
    expect(() => fromDot('foo { a -- b }')).toThrow('Invalid DOT header');
    expect(() => fromDot('graph a -- b')).toThrow('Invalid DOT header');
    expect(() => fromDot('graph } {')).toThrow('Invalid DOT header');

    expect(() => fromDot('graph { subgraph s { a -- b } }')).toThrow(
      'DOT subgraphs are not supported',
    );

    expect(() => fromDot('graph { { a } }')).toThrow('DOT subgraphs are not supported');
    expect(() => fromMermaid('hello')).toThrow('Mermaid text must start with flowchart/graph');
    expect(() => fromMermaid('x graph TD\na --> b')).toThrow('must start with flowchart/graph');
  });
});

describe('DOT and Mermaid reading', () => {
  it('skips comments and reads weights, numbers and chains', () => {
    const graph = fromDot(
      '/* head\n   spans */ strict digraph G { // line\n a -> b [weight=2.5]; # hash\n b -> c -> a [weight = "-4"]\n 12 -> 3.5\n}',
    );

    expect(graph.directed).toBe(true);
    expect(edgesOf(graph)).toEqual(['a>b:2.5', 'b>c:-4', 'c>a:-4', '12>3.5:1']);
  });

  it('declares nodes without edges and unquotes escapes', () => {
    const graph = fromDot('graph { "x\\"y"; z; k=v }');

    expect(graph.vertices()).toEqual(['x"y', 'z']);
    expect(graph.directed).toBe(false);
  });

  it('reads weights on edges, spacing and mixed arrows in Mermaid', () => {
    const graph = fromMermaid('graph TD %% note\n  a --- b;\n  b -->|3| c\n  d["Dee"]\n');

    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['a', 'b', 'c', 'Dee']);
    expect(graph.edgesBetween(b, c)[0]?.weight).toBe(3);
    expect(fromMermaid('flowchart LR\n a --- b').directed).toBe(false);
  });
});
