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
    // Measured on every drag: the first edge re-renders the canvas, so earlier boxes may be stale.
    const center = async (name: string) => {
      const box = (await vertex(page, name).locator('circle').boundingBox())!;

      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const drag = async () => {
      const [from, to] = [await center('0'), await center('3')];

      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 5 });
      await page.mouse.up();
    };

    await drag();
    await expect(page.locator('svg.graph line')).toHaveCount(7);

    // WebKit on Linux sometimes drops a synthetic drag that follows a re-render, so retry it.
    await expect(async () => {
      await drag();
      await expect(page.getByRole('alert')).toContainText('already exists', { timeout: 1500 });
    }).toPass({ timeout: 10_000 });

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
