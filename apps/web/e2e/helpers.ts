import { expect, type Page } from '@playwright/test';

/** Whether this browser can create a WebGL context (headless Firefox on CI often cannot). */
export const hasWebgl = (page: Page): Promise<boolean> =>
  page.evaluate(() => globalThis.document.createElement('canvas').getContext('webgl') !== null);

/** Vertices of a big graph: the WebGL canvas reports them, else they are SVG circles. */
export async function drawnVertices(page: Page, expected: number): Promise<void> {
  if (await hasWebgl(page)) {
    await expect(page.locator('canvas.gl-layer')).toHaveAttribute(
      'data-vertices',
      String(expected),
    );
  } else {
    await expect(page.locator('svg.graph circle')).toHaveCount(expected);
  }
}

/** Opens the combobox called `label` and picks the option with the visible text `option`. */
export async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('combobox', { name: label, exact: true })).toHaveValue(option);
}
