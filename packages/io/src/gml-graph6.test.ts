import { GraphBuilder, GraphError, vertexId } from '@graph-toolkit/core';
import { cycleGraph, petersenGraph, pathGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import { fromGml, fromGraph6, ParseError, toGml, toGraph6 } from './index.js';

describe('GML', () => {
  it('round-trips names, weights and direction', () => {
    const builder = new GraphBuilder({ directed: true });
    builder.addVertex(vertexId('a "x"')).addVertex(vertexId('b&c')).addVertex(vertexId('lonely'));
    builder.addEdge(vertexId('a "x"'), vertexId('b&c'), 2.5);
    const graph = fromGml(toGml(builder.build()));
    expect(graph.directed).toBe(true);
    expect(graph.vertices()).toEqual(['a "x"', 'b&c', 'lonely']);
    expect(graph.edges()).toEqual([{ source: 'a "x"', target: 'b&c', weight: 2.5 }]);
  });

  it('reads foreign files: missing label falls back to the id, unknown keys are ignored', () => {
    const graph = fromGml(
      'graph [ comment "x" node [ id 7 ] node [ id 8 extra 1 ] edge [ source 7 target 8 ] ]',
    );
    expect(graph.directed).toBe(false);
    expect(graph.edges()).toEqual([{ source: '7', target: '8', weight: 1 }]);
  });

  it('writes undirected graphs and rejects non-numeric edge endpoints', () => {
    expect(toGml(pathGraph(2))).toContain('directed 0');
    expect(() => fromGml('graph [ node [ id 1 ] edge [ source a target 1 ] ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ node [ id 1 ] edge [ source 1 target b ] ]')).toThrow(ParseError);
  });

  it('keeps non-numeric bare values as strings', () => {
    expect(fromGml('graph [ creator me node [ id 0 label "z" ] ]').vertices()).toEqual(['z']);
  });

  it('rejects malformed documents', () => {
    expect(() => fromGml('node [ id 1 ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ node [ label "x" ] ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ node [ id 1 ] edge [ source 1 target 2 ] ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ node [ id 1 ] ')).toThrow(ParseError);
    expect(() => fromGml('graph [ ] ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ directed ]')).toThrow(ParseError);
    expect(() => fromGml('graph [ node [ id 1')).toThrow(ParseError);
    expect(() => fromGml('')).toThrow(ParseError);
  });
});

describe('graph6', () => {
  it('matches known encodings', () => {
    expect(toGraph6(pathGraph(0))).toBe('?');
    expect(toGraph6(pathGraph(2))).toBe('A_');
    expect(toGraph6(cycleGraph(5))).toBe('Dhc');
  });

  it('round-trips the Petersen graph and trims the header', () => {
    const graph = petersenGraph();
    expect(toGraph6(fromGraph6('>>graph6<<' + toGraph6(graph) + '\n'))).toBe(toGraph6(graph));
  });

  it('uses the extended order encoding above 62 vertices', () => {
    const graph = pathGraph(70);
    const text = toGraph6(graph);
    expect(text.startsWith('~')).toBe(true);
    expect(fromGraph6(text).edgeCount).toBe(69);
  });

  it('rejects unsupported graphs and malformed text', () => {
    expect(() => toGraph6(pathGraph(3, { directed: true }))).toThrow(GraphError);
    const loop = new GraphBuilder({ directed: false });
    loop.addVertex(vertexId('0')).addEdge(vertexId('0'), vertexId('0'));
    expect(() => toGraph6(loop.build())).toThrow(GraphError);
    expect(() => fromGraph6('')).toThrow(ParseError);
    expect(() => fromGraph6('\u{1}')).toThrow(ParseError);
    expect(() => fromGraph6('~??')).toThrow(ParseError);
    expect(() => toGraph6(pathGraph(258_048))).toThrow(GraphError);
    expect(() => fromGraph6('Dh')).toThrow(ParseError);
  });
});
