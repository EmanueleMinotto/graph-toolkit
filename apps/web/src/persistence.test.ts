import { cycleGraph, pathGraph, toJson } from 'graph-toolkit';
import { describe, expect, it, vi } from 'vitest';
import { loadGraph, saveGraph, shareHash, shareUrl } from './persistence.js';

const emptyStorage = { getItem: () => null };

describe('persistence', () => {
  it('round-trips a graph through the URL fragment, including non-ASCII names', () => {
    const graph = pathGraph(3);

    expect(loadGraph(shareHash(graph), emptyStorage)?.edges()).toEqual(graph.edges());
    const text = loadGraph(shareHash(graph), emptyStorage);

    expect(text?.vertices()).toEqual(['0', '1', '2']);
  });

  it('prefers the link over storage and falls back to storage', () => {
    const stored = { getItem: () => toJson(cycleGraph(4)) };

    expect(loadGraph(shareHash(pathGraph(2)), stored)?.vertexCount).toBe(2);
    expect(loadGraph('', stored)?.vertexCount).toBe(4);
    expect(loadGraph('', emptyStorage)).toBeUndefined();
  });

  it('ignores corrupt links and corrupt storage', () => {
    expect(loadGraph('#g=@@@', emptyStorage)).toBeUndefined();
    expect(loadGraph('', { getItem: () => '{not json' })).toBeUndefined();
  });

  it('builds a share URL from the page location', () => {
    const url = shareUrl(pathGraph(2), { origin: 'https://example.org', pathname: '/app/' });

    expect(url.startsWith('https://example.org/app/#g=')).toBe(true);
  });

  it('saves to storage and the address bar, dropping huge links', () => {
    const setItem = vi.fn();
    const replaceState = vi.fn();

    saveGraph(pathGraph(3), { setItem }, { replaceState });
    expect(setItem).toHaveBeenCalledOnce();
    expect(String(replaceState.mock.calls[0]?.[2])).toMatch(/^#g=/u);
    saveGraph(pathGraph(2000), { setItem }, { replaceState });
    expect(replaceState.mock.calls[1]?.[2]).toBe('#');
  });

  it('survives a storage that refuses writes', () => {
    const setItem = vi.fn(() => {
      throw new Error('quota');
    });

    expect(() => {
      saveGraph(pathGraph(2), { setItem }, { replaceState: vi.fn() });
    }).not.toThrow();
  });
});
