import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('applies an operation with a generated second graph, then undoes it', async ({ page }) => {
  await page.getByLabel('Second graph', { exact: true }).selectOption('path');
  await page.getByLabel('Vertices in second graph').fill('3');
  await page.getByRole('button', { name: 'Create second graph' }).click();
  await expect(page.getByText('Second graph: 3 vertices, 2 edges')).toBeVisible();
  await page.getByLabel('Operation').selectOption('cartesian');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(18);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(6);
});

test('takes the complement and reports missing input', async ({ page }) => {
  await page.getByLabel('Operation').selectOption('complement');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('svg.graph line')).toHaveCount(9);
  await page.getByLabel('Operation').selectOption('subgraph');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('alert')).toContainText('vertices to keep');
  await page.getByLabel('Keep vertices').fill('0, 1, 2');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(3);
});

test('checks isomorphism against the second graph', async ({ page }) => {
  await page.getByLabel('Second graph', { exact: true }).selectOption('cycle');
  await page.getByLabel('Vertices in second graph').fill('6');
  await page.getByRole('button', { name: 'Create second graph' }).click();
  await page.getByLabel('Algorithm').selectOption('isomorphism');
  await expect(page.getByRole('status')).toContainText('Isomorphic');
});

test('shows the adjacency matrix and its square', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('adjacency-power');
  await expect(page.getByRole('status')).toContainText('Walks of length 2');
  await expect(page.getByRole('columnheader', { name: '5' })).toBeVisible();
  await page.getByLabel('Length (k)').fill('3');
  await expect(page.getByRole('status')).toContainText('length 3');
});

test('normalizes with a prefix and validates the result', async ({ page }) => {
  await page.getByLabel('Operation').selectOption('relabel');
  await page.getByLabel('Prefix').fill('v');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(
    page.locator('svg.graph [data-testid=viewport] > g', { hasText: 'v0' }),
  ).toBeVisible();
  await page.getByLabel('Vertex id pattern (regex)').fill('^[0-9]+$');
  await page.getByLabel('Must be connected').check();
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByText('vertex-id').first()).toBeVisible();
  await page.getByLabel('Vertex id pattern (regex)').fill('(');
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByRole('alert')).toContainText('regular expression');
});
