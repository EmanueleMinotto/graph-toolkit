import { expect, test, type Page } from '@playwright/test';
import { choose } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const vertex = (page: Page, name: string) =>
  page.locator('svg.graph [data-testid=viewport] > g', { hasText: name }).first();

test.describe('editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('Edit', { exact: true }).click();
  });

  test('adds a vertex on click without moving the others', async ({ page }) => {
    const before = await vertex(page, '0').getAttribute('transform');
    const box = (await page.locator('svg.graph').boundingBox())!;
    await page.mouse.click(box.x + 40, box.y + 40);
    await expect(page.locator('svg.graph circle')).toHaveCount(7);
    await expect(vertex(page, '0')).toHaveAttribute('transform', before!);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('svg.graph circle')).toHaveCount(6);
  });

  test('drags between two vertices to add an edge, once only', async ({ page }) => {
    const [a, b] = await Promise.all(
      ['0', '3'].map(async (name) => (await vertex(page, name).locator('circle').boundingBox())!),
    );
    const drag = async () => {
      await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
      await page.mouse.down();
      await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 5 });
      await page.mouse.up();
    };
    await drag();
    await expect(page.locator('svg.graph line')).toHaveCount(7);
    await drag();
    await expect(page.getByRole('alert')).toContainText('already exists');
    await expect(page.locator('svg.graph line')).toHaveCount(7);
    await page.getByLabel('Allow parallel edges').check();
    await drag();
    await expect(page.locator('svg.graph line')).toHaveCount(8);
  });

  test('removes the selected vertex and edge', async ({ page }) => {
    await vertex(page, '0').click();
    await page.getByRole('button', { name: 'Remove vertex' }).click();
    await expect(page.locator('svg.graph circle')).toHaveCount(5);
    await expect(page.locator('svg.graph line')).toHaveCount(4);
    await vertex(page, '1').click();
    await vertex(page, '2').click();
    await page.getByRole('button', { name: 'Remove edge' }).click();
    await expect(page.locator('svg.graph line')).toHaveCount(3);
  });

  test('sets an edge weight used by shortest paths', async ({ page }) => {
    await vertex(page, '0').click();
    await vertex(page, '1').click();
    await page.getByLabel('Edge weight').fill('10');
    await page.getByRole('button', { name: 'Set weight on edge' }).click();
    await choose(page, 'Algorithm', 'Shortest path');
    await vertex(page, '0').click();
    await vertex(page, '1').click();
    await expect(page.locator('output')).toContainText('Distance 5');
  });
});
