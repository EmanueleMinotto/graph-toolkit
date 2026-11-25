import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows analysis tables and disables tools the graph cannot run', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('coloring');
  await expect(page.getByRole('cell', { name: '0', exact: true }).first()).toBeVisible();
  await page.getByLabel('Format').selectOption('edge-list');
  await page.getByLabel('Directed (edge list / CSV)').check();
  await page.getByLabel('Graph text').fill('a b');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(
    page.getByRole('option', { name: /Minimum spanning tree \(Kruskal\) \(needs/ }),
  ).toBeDisabled();
});

test('lists connected components and checks bipartiteness', async ({ page }) => {
  await page.getByLabel('Format').selectOption('edge-list');
  await page.getByLabel('Graph text').fill('a b\nc d\nd e');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('Algorithm').selectOption('components');
  await expect(page.getByRole('status')).toContainText('2 components');
  await expect(page.getByRole('cell', { name: 'c, d, e' })).toBeVisible();
  await page.getByLabel('Algorithm').selectOption('bipartite');
  await expect(page.getByRole('status')).toContainText('Bipartite');
});

test('lists k shortest paths with an adjustable count', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('k-shortest');
  await page.getByLabel('Paths (k)').fill('2');
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '0' }).click();
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '3' }).click();
  await expect(page.getByRole('status')).toContainText('2 loopless paths');
  await expect(page.getByRole('cell', { name: '0 → 1 → 2 → 3' })).toBeVisible();
});

test('finds a Hamiltonian cycle in the default cycle graph', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('hamiltonian-cycle');
  await expect(page.getByRole('status')).toContainText('Hamiltonian cycle found');
});

test('colors edges and builds a tree from a Prüfer code', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('edge-coloring');
  await expect(page.getByRole('status')).toContainText('edge colors');
  await expect(page.locator('svg.graph line.e0')).not.toHaveCount(0);
  await page.getByLabel('Format').selectOption('prufer');
  await page.getByLabel('Graph text').fill('3 3 3 4');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(6);
  await expect(page.locator('svg.graph line')).toHaveCount(5);
  await page.getByLabel('Algorithm').selectOption('rooted-tree');
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '3' }).click();
  await expect(page.getByRole('status')).toContainText('Rooted at 3');
});
