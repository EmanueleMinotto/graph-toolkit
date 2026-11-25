// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { dictionary, setLang, t } from './i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    setLang('en');
  });

  it('returns English text unchanged', () => {
    expect(t('Generate')).toBe('Generate');
  });

  it('translates to Italian and falls back to the original text', () => {
    setLang('it');
    expect(t('Generate')).toBe('Genera');
    expect(t('Something new')).toBe('Something new');
  });

  it('has a non-empty translation for every entry', () => {
    for (const [english, italian] of Object.entries(dictionary)) {
      expect(`${english}:${italian === '' ? 'empty' : 'ok'}`).toBe(`${english}:ok`);
    }
  });

  it('translates algorithm names, groups and results', () => {
    setLang('it');
    expect(t('Minimum cut')).toBe('Taglio minimo');
    expect(t('Flow and matching')).toBe('Flussi e matching');
    expect(t('Pick two vertices.')).toBe('Scegli due vertici.');
    expect(t('3 bridges')).toBe('3 ponti');
    expect(t('1 bridge')).toBe('1 ponte');
    expect(t('2 communities')).toBe('2 comunità');
    expect(t('Distance 5 via a → b')).toBe('Distanza 5 passando per a → b');
    expect(t('No Eulerian trail.')).toBe('Nessun cammino euleriano.');
    expect(t('Eulerian trail found')).toBe('Cammino euleriano trovato');
    expect(t('Bridges (cut edges) (needs an undirected graph)')).toBe(
      'Ponti (archi di taglio) (richiede un grafo non orientato)',
    );
    expect(t('Click vertices to choose start (a) and target (b).')).toBe(
      "Clicca i vertici per scegliere la partenza (a) e l'arrivo (b).",
    );
    expect(t('Petersen graph')).toBe('Grafo di Petersen');
  });
});
