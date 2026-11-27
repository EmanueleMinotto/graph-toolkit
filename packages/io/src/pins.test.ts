/* eslint-disable unicorn/prefer-https -- the pinned XML namespaces are http URIs by specification */
import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  fromBinary,
  fromDimacs,
  fromDot,
  fromGexf,
  fromGml,
  fromGraph6,
  fromGraphMl,
  fromJson,
  fromMermaid,
  fromPajek,
  fromSparse6,
  toBinary,
  toDimacs,
  toDot,
  toGexf,
  toGml,
  toGraph6,
  toGraphMl,
  toJson,
  toMermaid,
  toPajek,
  toSparse6,
} from './index.js';

function weighted(graph: Graph, directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + (index % 4) * 0.5);
  }

  return builder.build();
}

const listed = (graph: Graph): string[] =>
  graph.edges().map((edge) => `${edge.source}-${edge.target}:${edge.weight}`);

const buildCases = () => {
  const plain = randomGraph(70, { probability: 0.04, seed: 81 });
  const small = weighted(randomGraph(9, { probability: 0.35, seed: 82 }), false);
  const directed = weighted(randomGraph(8, { probability: 0.35, seed: 83 }), true);
  const named = new GraphBuilder()
    .addVertex(vertexId('x y'))
    .addVertex(vertexId('q"r'))
    .addVertex(vertexId('a&b'))
    .addEdge(vertexId('x y'), vertexId('q"r'), 2.5)
    .addEdge(vertexId('q"r'), vertexId('a&b'))
    .build();

  return {
    graph6: [
      toGraph6(plain),
      toGraph6(randomGraph(63, { probability: 0.05, seed: 84 })),
      toGraph6(small),
    ],
    graph6Back: [listed(fromGraph6(toGraph6(plain))).length, listed(fromGraph6(toGraph6(small)))],
    sparse6: [
      toSparse6(plain),
      toSparse6(small),
      toSparse6(randomGraph(5, { probability: 0.5, seed: 85 })),
    ],
    sparse6Back: [
      listed(fromSparse6(toSparse6(plain))).length,
      listed(fromSparse6(toSparse6(small))),
    ],
    dot: [toDot(small), toDot(directed), toDot(named)],
    dotBack: [
      listed(fromDot(toDot(small))),
      listed(fromDot(toDot(directed))),
      listed(fromDot(toDot(named))),
    ],
    json: [toJson(small), listed(fromJson(toJson(directed)))],
    gml: [toGml(small), listed(fromGml(toGml(directed))), listed(fromGml(toGml(named)))],
    graphml: [
      toGraphMl(small),
      listed(fromGraphMl(toGraphMl(directed))),
      listed(fromGraphMl(toGraphMl(named))),
    ],
    gexf: [toGexf(directed), listed(fromGexf(toGexf(small))), listed(fromGexf(toGexf(named)))],
    dimacs: [toDimacs(small), toDimacs(directed), listed(fromDimacs(toDimacs(directed)))],
    pajek: [
      toPajek(small),
      toPajek(directed),
      listed(fromPajek(toPajek(directed))),
      listed(fromPajek(toPajek(named))),
    ],
    mermaid: [
      toMermaid(small),
      toMermaid(directed),
      listed(fromMermaid(toMermaid(directed))),
      listed(fromMermaid(toMermaid(named))),
    ],
    binary: [
      [...toBinary(small)],
      listed(fromBinary(toBinary(directed))),
      listed(fromBinary(toBinary(named))),
    ],
  };
};

describe('pinned results', () => {
  it('keeps the output of the writers and the round trips', () => {
    expect(
      Object.fromEntries(
        Object.entries(buildCases()).map(([key, value]) => [key, JSON.stringify(value)]),
      ),
    ).toEqual({
      binary:
        '[[71,84,66,1,0,9,11,1,48,1,49,1,50,1,51,1,52,1,53,1,54,1,55,1,56,0,3,0,0,5,1,0,0,0,0,0,0,248,63,0,6,1,0,0,0,0,0,0,0,64,2,4,1,0,0,0,0,0,0,4,64,2,6,0,2,8,1,0,0,0,0,0,0,248,63,3,5,1,0,0,0,0,0,0,0,64,3,7,1,0,0,0,0,0,0,4,64,4,8,0,5,7,1,0,0,0,0,0,0,248,63,6,7,1,0,0,0,0,0,0,0,64],["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      dimacs:
        '["p edge 9 11\\ne 1 4 1\\ne 1 6 1.5\\ne 1 7 2\\ne 3 5 2.5\\ne 3 7 1\\ne 3 9 1.5\\ne 4 6 2\\ne 4 8 2.5\\ne 5 9 1\\ne 6 8 1.5\\ne 7 8 2\\n","p sp 8 11\\na 1 4 1\\na 2 3 1.5\\na 2 6 2\\na 2 7 2.5\\na 3 4 1\\na 3 5 1.5\\na 3 7 2\\na 3 8 2.5\\na 4 6 1\\na 5 6 1.5\\na 5 8 2\\n",["1-4:1","2-3:1.5","2-6:2","2-7:2.5","3-4:1","3-5:1.5","3-7:2","3-8:2.5","4-6:1","5-6:1.5","5-8:2"]]',
      dot: '["graph {\\n  \\"0\\";\\n  \\"1\\";\\n  \\"2\\";\\n  \\"3\\";\\n  \\"4\\";\\n  \\"5\\";\\n  \\"6\\";\\n  \\"7\\";\\n  \\"8\\";\\n  \\"0\\" -- \\"3\\" [weight=1];\\n  \\"0\\" -- \\"5\\" [weight=1.5];\\n  \\"0\\" -- \\"6\\" [weight=2];\\n  \\"2\\" -- \\"4\\" [weight=2.5];\\n  \\"2\\" -- \\"6\\" [weight=1];\\n  \\"2\\" -- \\"8\\" [weight=1.5];\\n  \\"3\\" -- \\"5\\" [weight=2];\\n  \\"3\\" -- \\"7\\" [weight=2.5];\\n  \\"4\\" -- \\"8\\" [weight=1];\\n  \\"5\\" -- \\"7\\" [weight=1.5];\\n  \\"6\\" -- \\"7\\" [weight=2];\\n}\\n","digraph {\\n  \\"0\\";\\n  \\"1\\";\\n  \\"2\\";\\n  \\"3\\";\\n  \\"4\\";\\n  \\"5\\";\\n  \\"6\\";\\n  \\"7\\";\\n  \\"0\\" -> \\"3\\" [weight=1];\\n  \\"1\\" -> \\"2\\" [weight=1.5];\\n  \\"1\\" -> \\"5\\" [weight=2];\\n  \\"1\\" -> \\"6\\" [weight=2.5];\\n  \\"2\\" -> \\"3\\" [weight=1];\\n  \\"2\\" -> \\"4\\" [weight=1.5];\\n  \\"2\\" -> \\"6\\" [weight=2];\\n  \\"2\\" -> \\"7\\" [weight=2.5];\\n  \\"3\\" -> \\"5\\" [weight=1];\\n  \\"4\\" -> \\"5\\" [weight=1.5];\\n  \\"4\\" -> \\"7\\" [weight=2];\\n}\\n","graph {\\n  \\"x y\\";\\n  \\"q\\\\\\"r\\";\\n  \\"a&b\\";\\n  \\"x y\\" -- \\"q\\\\\\"r\\" [weight=2.5];\\n  \\"q\\\\\\"r\\" -- \\"a&b\\" [weight=1];\\n}\\n"]',
      dotBack:
        '[["0-3:1","0-5:1.5","0-6:2","2-4:2.5","2-6:1","2-8:1.5","3-5:2","3-7:2.5","4-8:1","5-7:1.5","6-7:2"],["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      gexf: '["<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<gexf xmlns=\\"http://gexf.net/1.3\\" version=\\"1.3\\">\\n  <graph defaultedgetype=\\"directed\\">\\n    <nodes>\\n      <node id=\\"0\\" label=\\"0\\"/>\\n      <node id=\\"1\\" label=\\"1\\"/>\\n      <node id=\\"2\\" label=\\"2\\"/>\\n      <node id=\\"3\\" label=\\"3\\"/>\\n      <node id=\\"4\\" label=\\"4\\"/>\\n      <node id=\\"5\\" label=\\"5\\"/>\\n      <node id=\\"6\\" label=\\"6\\"/>\\n      <node id=\\"7\\" label=\\"7\\"/>\\n    </nodes>\\n    <edges>\\n      <edge id=\\"0\\" source=\\"0\\" target=\\"3\\" weight=\\"1\\"/>\\n      <edge id=\\"1\\" source=\\"1\\" target=\\"2\\" weight=\\"1.5\\"/>\\n      <edge id=\\"2\\" source=\\"1\\" target=\\"5\\" weight=\\"2\\"/>\\n      <edge id=\\"3\\" source=\\"1\\" target=\\"6\\" weight=\\"2.5\\"/>\\n      <edge id=\\"4\\" source=\\"2\\" target=\\"3\\" weight=\\"1\\"/>\\n      <edge id=\\"5\\" source=\\"2\\" target=\\"4\\" weight=\\"1.5\\"/>\\n      <edge id=\\"6\\" source=\\"2\\" target=\\"6\\" weight=\\"2\\"/>\\n      <edge id=\\"7\\" source=\\"2\\" target=\\"7\\" weight=\\"2.5\\"/>\\n      <edge id=\\"8\\" source=\\"3\\" target=\\"5\\" weight=\\"1\\"/>\\n      <edge id=\\"9\\" source=\\"4\\" target=\\"5\\" weight=\\"1.5\\"/>\\n      <edge id=\\"10\\" source=\\"4\\" target=\\"7\\" weight=\\"2\\"/>\\n    </edges>\\n  </graph>\\n</gexf>\\n",["0-3:1","0-5:1.5","0-6:2","2-4:2.5","2-6:1","2-8:1.5","3-5:2","3-7:2.5","4-8:1","5-7:1.5","6-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      gml: '["graph [\\n  directed 0\\n  node [ id 0 label \\"0\\" ]\\n  node [ id 1 label \\"1\\" ]\\n  node [ id 2 label \\"2\\" ]\\n  node [ id 3 label \\"3\\" ]\\n  node [ id 4 label \\"4\\" ]\\n  node [ id 5 label \\"5\\" ]\\n  node [ id 6 label \\"6\\" ]\\n  node [ id 7 label \\"7\\" ]\\n  node [ id 8 label \\"8\\" ]\\n  edge [ source 0 target 3 weight 1 ]\\n  edge [ source 0 target 5 weight 1.5 ]\\n  edge [ source 0 target 6 weight 2 ]\\n  edge [ source 2 target 4 weight 2.5 ]\\n  edge [ source 2 target 6 weight 1 ]\\n  edge [ source 2 target 8 weight 1.5 ]\\n  edge [ source 3 target 5 weight 2 ]\\n  edge [ source 3 target 7 weight 2.5 ]\\n  edge [ source 4 target 8 weight 1 ]\\n  edge [ source 5 target 7 weight 1.5 ]\\n  edge [ source 6 target 7 weight 2 ]\\n]\\n",["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      graph6:
        '["~?@E???????G?_?_??KC?????????????_???????OGA`???G??????????@????C???COA_A`A????????_??????_???A??G_C?????????C_??@?C?_???_?A???_??@???????C???P??????????????????????G???O?????C_??????????C?A????O?C??_?????O????????????C?@I?@????_????G???_???A??C??G?G@????C??@??????????C?????????@??????????G????_???P??????_C???????????A?`????CO?AO??_G??_?W?OAK??????_??G?????C?@???G?????????G?_??a??????ACC??E???_??????????","~??~?@??A??????O??_????W?A@???C?O???A?????????C????_?@??KO??G?@?G??@??H????????C????????Q??????GG_??????A??G????CG?@CG?A?G????@??OA?????????????G??A???@_???C??????????????????????H??_?????_???????H@_??????????????????G???@G@?????@@???????????@????PO?_?C?_Q??O???????GCAC?????????@??????_???????GW?_???@O?????????G??_??????O?_??A??","HCIT?kg"]',
      graph6Back:
        '[105,["0-3:1","0-5:1","0-6:1","2-4:1","2-6:1","2-8:1","3-5:1","3-7:1","4-8:1","5-7:1","6-7:1"]]',
      graphml:
        '["<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<graphml xmlns=\\"http://graphml.graphdrawing.org/xmlns\\">\\n  <key id=\\"d0\\" for=\\"edge\\" attr.name=\\"weight\\" attr.type=\\"double\\"/>\\n  <graph id=\\"G\\" edgedefault=\\"undirected\\">\\n    <node id=\\"0\\"/>\\n    <node id=\\"1\\"/>\\n    <node id=\\"2\\"/>\\n    <node id=\\"3\\"/>\\n    <node id=\\"4\\"/>\\n    <node id=\\"5\\"/>\\n    <node id=\\"6\\"/>\\n    <node id=\\"7\\"/>\\n    <node id=\\"8\\"/>\\n    <edge source=\\"0\\" target=\\"3\\"><data key=\\"d0\\">1</data></edge>\\n    <edge source=\\"0\\" target=\\"5\\"><data key=\\"d0\\">1.5</data></edge>\\n    <edge source=\\"0\\" target=\\"6\\"><data key=\\"d0\\">2</data></edge>\\n    <edge source=\\"2\\" target=\\"4\\"><data key=\\"d0\\">2.5</data></edge>\\n    <edge source=\\"2\\" target=\\"6\\"><data key=\\"d0\\">1</data></edge>\\n    <edge source=\\"2\\" target=\\"8\\"><data key=\\"d0\\">1.5</data></edge>\\n    <edge source=\\"3\\" target=\\"5\\"><data key=\\"d0\\">2</data></edge>\\n    <edge source=\\"3\\" target=\\"7\\"><data key=\\"d0\\">2.5</data></edge>\\n    <edge source=\\"4\\" target=\\"8\\"><data key=\\"d0\\">1</data></edge>\\n    <edge source=\\"5\\" target=\\"7\\"><data key=\\"d0\\">1.5</data></edge>\\n    <edge source=\\"6\\" target=\\"7\\"><data key=\\"d0\\">2</data></edge>\\n  </graph>\\n</graphml>\\n",["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      json: '["{\\"directed\\":false,\\"vertices\\":[\\"0\\",\\"1\\",\\"2\\",\\"3\\",\\"4\\",\\"5\\",\\"6\\",\\"7\\",\\"8\\"],\\"edges\\":[{\\"source\\":\\"0\\",\\"target\\":\\"3\\",\\"weight\\":1},{\\"source\\":\\"0\\",\\"target\\":\\"5\\",\\"weight\\":1.5},{\\"source\\":\\"0\\",\\"target\\":\\"6\\",\\"weight\\":2},{\\"source\\":\\"2\\",\\"target\\":\\"4\\",\\"weight\\":2.5},{\\"source\\":\\"2\\",\\"target\\":\\"6\\",\\"weight\\":1},{\\"source\\":\\"2\\",\\"target\\":\\"8\\",\\"weight\\":1.5},{\\"source\\":\\"3\\",\\"target\\":\\"5\\",\\"weight\\":2},{\\"source\\":\\"3\\",\\"target\\":\\"7\\",\\"weight\\":2.5},{\\"source\\":\\"4\\",\\"target\\":\\"8\\",\\"weight\\":1},{\\"source\\":\\"5\\",\\"target\\":\\"7\\",\\"weight\\":1.5},{\\"source\\":\\"6\\",\\"target\\":\\"7\\",\\"weight\\":2}]}",["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"]]',
      mermaid:
        '["flowchart LR\\n  n0[\\"0\\"]\\n  n1[\\"1\\"]\\n  n2[\\"2\\"]\\n  n3[\\"3\\"]\\n  n4[\\"4\\"]\\n  n5[\\"5\\"]\\n  n6[\\"6\\"]\\n  n7[\\"7\\"]\\n  n8[\\"8\\"]\\n  n0 ---|1| n3\\n  n0 ---|1.5| n5\\n  n0 ---|2| n6\\n  n2 ---|2.5| n4\\n  n2 ---|1| n6\\n  n2 ---|1.5| n8\\n  n3 ---|2| n5\\n  n3 ---|2.5| n7\\n  n4 ---|1| n8\\n  n5 ---|1.5| n7\\n  n6 ---|2| n7\\n","flowchart LR\\n  n0[\\"0\\"]\\n  n1[\\"1\\"]\\n  n2[\\"2\\"]\\n  n3[\\"3\\"]\\n  n4[\\"4\\"]\\n  n5[\\"5\\"]\\n  n6[\\"6\\"]\\n  n7[\\"7\\"]\\n  n0 -->|1| n3\\n  n1 -->|1.5| n2\\n  n1 -->|2| n5\\n  n1 -->|2.5| n6\\n  n2 -->|1| n3\\n  n2 -->|1.5| n4\\n  n2 -->|2| n6\\n  n2 -->|2.5| n7\\n  n3 -->|1| n5\\n  n4 -->|1.5| n5\\n  n4 -->|2| n7\\n",["0-3:1","3-5:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","4-5:1.5","4-7:2"],["x y-q\\"r:2.5","q\\"r-a&b:1"]]',
      pajek:
        '["*Vertices 9\\n1 \\"0\\"\\n2 \\"1\\"\\n3 \\"2\\"\\n4 \\"3\\"\\n5 \\"4\\"\\n6 \\"5\\"\\n7 \\"6\\"\\n8 \\"7\\"\\n9 \\"8\\"\\n*Edges\\n1 4 1\\n1 6 1.5\\n1 7 2\\n3 5 2.5\\n3 7 1\\n3 9 1.5\\n4 6 2\\n4 8 2.5\\n5 9 1\\n6 8 1.5\\n7 8 2\\n","*Vertices 8\\n1 \\"0\\"\\n2 \\"1\\"\\n3 \\"2\\"\\n4 \\"3\\"\\n5 \\"4\\"\\n6 \\"5\\"\\n7 \\"6\\"\\n8 \\"7\\"\\n*Arcs\\n1 4 1\\n2 3 1.5\\n2 6 2\\n2 7 2.5\\n3 4 1\\n3 5 1.5\\n3 7 2\\n3 8 2.5\\n4 6 1\\n5 6 1.5\\n5 8 2\\n",["0-3:1","1-2:1.5","1-5:2","1-6:2.5","2-3:1","2-4:1.5","2-6:2","2-7:2.5","3-5:1","4-5:1.5","4-7:2"],["x y-q\'r:2.5","q\'r-a&b:1"]]',
      sparse6:
        '[":~?@EaOaHb?AGAWIR?xSLDG[HBguYAgqHBPWW`__LCh{HdH?__oqc?oW\\\\_oocbqMSewcLj@Y@HqinDAELEqi^kooYFP{kcbISKGo\\\\IRIWJJUy?g[b_OSiKzwBAp?kKGCCDPslMbmFC@OTNH?t_`]PEqspe@sbLRYE",":HeAS@oDKhhC",":DaGE@G~"]',
      sparse6Back:
        '[105,["0-3:1","0-5:1","0-6:1","2-4:1","2-6:1","2-8:1","3-5:1","3-7:1","4-8:1","5-7:1","6-7:1"]]',
    });
  });
});
