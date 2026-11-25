import { expect, test } from '@playwright/test';
import { choose, hasWebgl } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('draws big graphs on a WebGL canvas that follows zoom and selection', async ({ page }) => {
  // Skipped only in browsers without WebGL (headless Firefox on CI), where the SVG fallback is used.
  test.skip(!(await hasWebgl(page)), 'this browser has no WebGL');
  await choose(page, 'Kind', 'Random');
  await page.getByLabel('Size').fill('800');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  // A grid spreads the vertices evenly, so a zoomed-in screen holds only a few of them.
  await choose(page, 'Layout', 'Grid');
  const canvas = page.locator('canvas.gl-layer');
  await expect(canvas).toHaveAttribute('data-vertices', '800');
  await expect(page.locator('svg.graph.gl')).toBeVisible();
  const before = await canvas.screenshot();
  const box = (await page.locator('svg.graph').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let step = 0; step < 10; step++) await page.mouse.wheel(0, -400);
  await expect
    .poll(async () => {
      const after = await canvas.screenshot();
      return after.equals(before);
    })
    .toBe(false);
  // Zoomed in far enough, the vertices on screen come back as focusable SVG with labels.
  await expect
    .poll(() => page.locator('svg.graph circle').count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect(page.locator('svg.graph text.label').first()).toBeVisible();
});

test('translates algorithm names and results into Italian', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch language' }).click();
  await page.getByRole('button', { name: /Farfallino con coda/ }).click();
  await choose(page, 'Algoritmo', 'Ponti (archi di taglio)');
  await expect(page.getByText('1 ponte', { exact: true })).toBeVisible();
});

test('moves through the vertices of a big graph with the arrow keys', async ({ page }) => {
  // Skipped only in browsers without WebGL, where every vertex is already a focusable SVG node.
  test.skip(!(await hasWebgl(page)), 'this browser has no WebGL');
  await choose(page, 'Kind', 'Path');
  await page.getByLabel('Size').fill('400');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await choose(page, 'Layout', 'Grid');
  await expect(page.locator('canvas.gl-layer')).toHaveAttribute('data-vertices', '400');
  await page.locator('svg.graph').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('svg.graph circle.cursor')).toHaveCount(1);
  const first = await page
    .locator('svg.graph circle.cursor')
    .evaluate((node) => node.parentElement?.getAttribute('aria-label'));
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('svg.graph circle.cursor')).toHaveCount(1);
  await expect(page.locator('svg.graph circle.cursor').locator('..')).not.toHaveAttribute(
    'aria-label',
    first ?? '',
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('svg.graph circle.selected')).toHaveCount(1);
});
