import { vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { visibleLabels } from './labels.js';
import { IDENTITY } from './viewport.js';

const box = { width: 800, height: 520 };
const ids = ['a', 'b', 'c'].map((name) => vertexId(name));
const position = (id: string) => ({ x: id === 'c' ? 5000 : 100, y: 100 });

describe('visibleLabels', () => {
  it('draws nothing while zoomed out', () => {
    expect(visibleLabels({ vertices: ids, position, view: IDENTITY, box })).toHaveLength(0);
  });

  it('labels the vertices on screen once zoomed in, at their screen position', () => {
    const zoomed = { x: 10, y: 20, scale: 2 };
    const labels = visibleLabels({ vertices: ids, position, view: zoomed, box });
    expect(labels.map((label) => label.text)).toEqual(['a', 'b']);
    expect(labels[0]?.at).toEqual({ x: 210, y: 220 });
  });

  it('skips unplaced vertices', () => {
    const zoomed = { x: 0, y: 0, scale: 2 };
    const labels = visibleLabels({
      vertices: ids,
      position: (id) => (id === 'a' ? undefined : position(id)),
      view: zoomed,
      box,
    });
    expect(labels.map((label) => label.text)).toEqual(['b']);
  });
});
