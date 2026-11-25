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
});
