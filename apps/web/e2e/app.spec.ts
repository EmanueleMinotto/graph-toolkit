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
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: 'a' }).click();
  await page.locator('svg.graph [data-testid=viewport] > g', { hasText: 'c' }).click();
  await expect(page.getByRole('status')).toContainText('Distance 2');
});

test('exports the current graph', async ({ page }) => {
  await page.getByLabel('Format').selectOption('graphml');
  await page.getByRole('button', { name: 'Export current' }).click();
  await expect(page.getByLabel('Graph text')).toHaveValue(/<graphml/);
});

test('zooms with the wheel, pans the background and resets', async ({ page }) => {
  const viewport = page.getByTestId('viewport');
  const before = await viewport.getAttribute('transform');
  const box = (await page.locator('svg.graph').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -400);
  await expect(viewport).not.toHaveAttribute('transform', before!);
  const zoomed = await viewport.getAttribute('transform');
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60);
  await page.mouse.up();
  await expect(viewport).not.toHaveAttribute('transform', zoomed!);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(viewport).toHaveAttribute('transform', before!);
});

test('drags a vertex without selecting it', async ({ page }) => {
  const node = page.locator('svg.graph [data-testid=viewport] > g', { hasText: '0' });
  const before = await node.getAttribute('transform');
  const box = (await node.locator('circle').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 90, { steps: 5 });
  await page.mouse.up();
  await expect(node).not.toHaveAttribute('transform', before!);
  await expect(page.locator('circle.selected')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(node).toHaveAttribute('transform', before!);
});

test('generates a large graph quickly and caps oversized input', async ({ page }) => {
  await page.getByLabel('Kind').selectOption('random');
  await page.getByLabel('Size').fill('1000');
  const start = Date.now();
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(1000);
  expect(Date.now() - start).toBeLessThan(5000);
  await page.getByLabel('Kind').selectOption('complete');
  await page.getByLabel('Size').fill('5000');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(150);
});

test('undo and redo restore previous graphs', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await page.getByLabel('Size').fill('9');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(9);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(6);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.locator('svg.graph circle')).toHaveCount(9);
});

test('shows analysis tables and disables tools the graph cannot run', async ({ page }) => {
  await page.getByLabel('Algorithm').selectOption('coloring');
  await expect(page.getByRole('cell', { name: '0', exact: true }).first()).toBeVisible();
  await page.getByLabel('Format').selectOption('edge-list');
  await page.getByLabel('Directed (edge list / CSV)').check();
  await page.getByLabel('Graph text').fill('a b');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('option', { name: /Minimum spanning tree \(needs/ })).toBeDisabled();
});
