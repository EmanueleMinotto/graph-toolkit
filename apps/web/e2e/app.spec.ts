import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the default cycle', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'graph-toolkit' })).toBeVisible();
  await expect(page.locator('svg.graph circle')).toHaveCount(6);
  await expect(page.locator('svg.graph line')).toHaveCount(6);
});

test('generates a complete graph', async ({ page }) => {
  await page.getByLabel('Kind').selectOption('complete');
  await page.getByLabel('Size').fill('5');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(5);
  await expect(page.locator('svg.graph line')).toHaveCount(10);
});

test('imports an edge list and reports bad input', async ({ page }) => {
  await page.getByLabel('Format').selectOption('edge-list');
  await page.getByLabel('Graph text').fill('a b\nb c\nc d 2');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(4);
  await page.getByLabel('Graph text').fill('a');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid edge line');
});

test('finds a shortest path between two clicked vertices', async ({ page }) => {
  await page.getByLabel('Format').selectOption('edge-list');
  await page.getByLabel('Graph text').fill('a b 1\nb c 1\na c 5');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('Algorithm').selectOption('shortest-path');
  await page.locator('svg.graph g', { hasText: 'a' }).first().click();
  await page.locator('svg.graph g', { hasText: 'c' }).first().click();
  await expect(page.getByRole('status')).toContainText('Distance 2');
});

test('exports the current graph', async ({ page }) => {
  await page.getByLabel('Format').selectOption('graphml');
  await page.getByRole('button', { name: 'Export current' }).click();
  await expect(page.getByLabel('Graph text')).toHaveValue(/<graphml/);
});
