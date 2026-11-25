import { expect, test } from '@playwright/test';
import { choose } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows analysis tables and disables tools the graph cannot run', async ({ page }) => {
  await choose(page, 'Algorithm', 'DSATUR coloring');
  await expect(page.getByRole('cell', { name: '0', exact: true }).first()).toBeVisible();
  await choose(page, 'Format', 'Edge list');
  await page.getByLabel('Directed (edge list / CSV)').check();
  await page.getByLabel('Graph text').fill('a b');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByRole('combobox', { name: 'Algorithm', exact: true }).click();
  await expect(
    page.getByRole('option', { name: /Minimum spanning tree \(Kruskal\) \(needs/ }),
  ).toBeDisabled();
});

test('lists connected components and checks bipartiteness', async ({ page }) => {
  await choose(page, 'Format', 'Edge list');
  await page.getByLabel('Graph text').fill('a b\nc d\nd e');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await choose(page, 'Algorithm', 'Connected components');
  await expect(page.getByRole('status')).toContainText('2 components');
  await expect(page.getByRole('cell', { name: 'c, d, e' })).toBeVisible();
  await choose(page, 'Algorithm', 'Bipartition');
  await expect(page.getByRole('status')).toContainText('Bipartite');
});

test('lists k shortest paths with an adjustable count', async ({ page }) => {
  await choose(page, 'Algorithm', 'k shortest paths');
  await page.getByLabel('Paths (k)').fill('2');
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '0' }).click();
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '3' }).click();
  await expect(page.getByRole('status')).toContainText('2 loopless paths');
  await expect(page.getByRole('cell', { name: '0 → 1 → 2 → 3' })).toBeVisible();
});

test('finds a Hamiltonian cycle in the default cycle graph', async ({ page }) => {
  await choose(page, 'Algorithm', 'Hamiltonian cycle');
  await expect(page.getByRole('status')).toContainText('Hamiltonian cycle found');
});

test('colors edges and builds a tree from a Prüfer code', async ({ page }) => {
  await choose(page, 'Algorithm', 'Edge coloring');
  await expect(page.getByRole('status')).toContainText('edge colors');
  await expect(page.locator('svg.graph line.e0')).not.toHaveCount(0);
  await choose(page, 'Format', 'Prüfer code');
  await page.getByLabel('Graph text').fill('3 3 3 4');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(6);
  await expect(page.locator('svg.graph line')).toHaveCount(5);
  await choose(page, 'Algorithm', 'Rooted tree: depth and parent');
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: '3' }).click();
  await expect(page.getByRole('status')).toContainText('Rooted at 3');
});

test('ranks vertices by centrality and sizes the nodes', async ({ page }) => {
  await choose(page, 'Kind', 'Star');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await choose(page, 'Algorithm', 'Betweenness centrality');
  await expect(page.getByRole('status')).toContainText('highest is 0');
  const radii = await page
    .locator('svg.graph circle')
    .evaluateAll((circles) => circles.map((circle) => Number(circle.getAttribute('r'))));
  expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
});

test('computes a max flow on a directed network', async ({ page }) => {
  await choose(page, 'Format', 'Edge list');
  await page.getByLabel('Directed (edge list / CSV)').check();
  await page.getByLabel('Graph text').fill('s a 3\na t 2\ns t 1');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await choose(page, 'Algorithm', 'Max flow (Edmonds–Karp)');
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: 's' }).first().click();
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: 't' }).first().click();
  await expect(page.getByRole('status')).toContainText('= 3');
});
