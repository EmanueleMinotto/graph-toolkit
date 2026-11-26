// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { svgMarkup } from './export-image.js';

describe('svgMarkup', () => {
  it('inlines styles and adds a namespace and a background', () => {
    document.body.innerHTML =
      '<svg viewBox="0 0 10 10"><circle class="node" r="3" style="fill: red"></circle></svg>';
    const svg = document.querySelector('svg');
    if (svg === null) {
      throw new Error('missing svg');
    }
    const markup = svgMarkup(svg);
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('<rect');
    expect(markup).toContain('style="fill:');
  });
});
