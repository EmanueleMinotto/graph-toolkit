import { expect, test } from '@playwright/test';
import { choose, hasWebgl } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads an example and keeps it after a reload', async ({ page }) => {
  await page.getByRole('button', { name: /Petersen graph/ }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(10);
  await expect(page.locator('svg.graph line')).toHaveCount(15);
  await page.reload();
  await expect(page.locator('svg.graph circle')).toHaveCount(10);
});

test('puts the graph in the address bar and restores it from a link', async ({ page, context }) => {
  await page.getByRole('button', { name: /Cube Q3/ }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(8);
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#g=/u);
  const fresh = await context.newPage();
  await fresh.goto(page.url());
  await expect(fresh.locator('svg.graph circle')).toHaveCount(8);
});

test('exports the graph as SVG and PNG', async ({ page }) => {
  const svg = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const svgFile = await svg;
  expect(svgFile.suggestedFilename()).toBe('graph.svg');
  const png = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const pngFile = await png;
  expect(pngFile.suggestedFilename()).toBe('graph.png');
});

test('generates scale-free and small-world graphs and uses the radial layout', async ({ page }) => {
  await choose(page, 'Kind', 'Scale-free (Barabási–Albert)');
  await page.getByLabel('Size').fill('20');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(20);
  await choose(page, 'Layout', 'Radial');
  await expect(page.locator('svg.graph circle')).toHaveCount(20);
});

test('finds bridges with the new analysis tools', async ({ page }) => {
  await page.getByRole('button', { name: /Bowtie with a tail/ }).click();
  await choose(page, 'Algorithm', 'Bridges (cut edges)');
  await expect(page.getByText('1 bridge', { exact: true })).toBeVisible();
});

test('computes a minimum cut on the flow example', async ({ page }) => {
  await page.getByRole('button', { name: /Flow network/ }).click();
  await choose(page, 'Algorithm', 'Minimum cut');
  await page.locator('svg.graph g[aria-label="Vertex s"]').click();
  await page.locator('svg.graph g[aria-label="Vertex t"]').click();
  await expect(page.getByText(/Minimum cut s \| t has capacity/)).toBeVisible();
});

test('animates an algorithm step by step', async ({ page }) => {
  await choose(page, 'Algorithm', 'BFS order');
  await page.locator('svg.graph g[aria-label="Vertex 0"]').click();
  await expect(page.getByText('6/6')).toBeVisible();
  await expect(page.locator('svg.graph circle.c1')).toHaveCount(6);
  await page.getByRole('button', { name: 'Play animation' }).click();
  await expect(page.getByText('0/6')).toBeVisible();
  await expect(page.locator('svg.graph circle.c1')).toHaveCount(0);
  await expect(page.getByText('6/6')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible();
});

test('selects several vertices with Shift, drags them together and deletes them', async ({
  page,
}) => {
  const vertex = (id: string) => page.locator(`svg.graph g[aria-label="Vertex ${id}"]`);
  await vertex('0').click({ modifiers: ['Shift'] });
  await vertex('1').click({ modifiers: ['Shift'] });
  await expect(page.locator('svg.graph circle.grouped')).toHaveCount(2);
  const [a, b] = [
    await vertex('0').getAttribute('transform'),
    await vertex('1').getAttribute('transform'),
  ];
  const box = (await vertex('0').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(vertex('0')).not.toHaveAttribute('transform', a!);
  await expect(vertex('1')).not.toHaveAttribute('transform', b!);
  await page.keyboard.press('Delete');
  await expect(page.locator('svg.graph circle')).toHaveCount(4);
  await expect(page.locator('svg.graph circle.grouped')).toHaveCount(0);
});

test('Escape clears the Shift selection', async ({ page }) => {
  await page.locator('svg.graph g[aria-label="Vertex 2"]').click({ modifiers: ['Shift'] });
  await expect(page.locator('svg.graph circle.grouped')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('svg.graph circle.grouped')).toHaveCount(0);
});

test('switches the interface to Italian and remembers it', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('button', { name: 'Sposta Nuovo grafo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Genera', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sposta Nuovo grafo' })).toBeVisible();
  await page.getByRole('button', { name: 'Cambia lingua' }).click();
  await expect(page.getByRole('button', { name: 'Move New graph' })).toBeVisible();
});

test('draws the cube with the Tutte layout and bounds its treewidth', async ({ page }) => {
  await page.getByRole('button', { name: /Cube Q3/ }).click();
  await choose(page, 'Layout', 'Tutte (planar graphs)');
  await expect(page.locator('svg.graph circle')).toHaveCount(8);
  await choose(page, 'Layout', 'Spectral (up to 200 vertices)');
  await expect(page.locator('svg.graph circle')).toHaveCount(8);
  await choose(page, 'Algorithm', 'Treewidth (upper bound)');
  await expect(page.getByText(/Treewidth is at most \d+/)).toBeVisible();
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
