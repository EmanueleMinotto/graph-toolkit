import { expect, test, type Page } from '@playwright/test';
import { choose } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1800 }); // keep every handle on screen for dragging
  await page.goto('/');
});

test('lists options in groups with an icon on each one', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Algorithm', exact: true }).click();
  const list = page.getByRole('listbox');
  await expect(list.getByText('Paths', { exact: true })).toBeVisible();
  await expect(list.getByText('Coloring', { exact: true })).toBeVisible();
  const option = page.getByRole('option', { name: 'Dijkstra', exact: false }).first();
  await expect(option.locator('svg')).toHaveCount(1); // the icon; a check mark appears only on the selected option
});

test('filters the long algorithm list by typing', async ({ page }) => {
  const algorithm = page.getByRole('combobox', { name: 'Algorithm', exact: true });
  await algorithm.click();
  await algorithm.fill('planar');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Planarity test' }).click();
  await expect(page.locator('output')).toContainText('Planar');
});

test('collapses panels and remembers it after a reload', async ({ page }) => {
  const control = page.getByRole('button', { name: 'New graph', exact: true });
  await expect(page.getByLabel('Size')).toBeVisible();
  await control.click();
  await expect(page.getByLabel('Size')).toBeHidden();
  await page.reload();
  await expect(page.getByLabel('Size')).toBeHidden();
  await expect(page.getByLabel('Graph text')).toBeVisible();
  await page.getByRole('button', { name: 'New graph', exact: true }).click();
  await expect(page.getByLabel('Size')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Size')).toBeVisible();
  await choose(page, 'Layout', 'Circular');
});

const titles = (page: Page) =>
  page
    .getByRole('button', { name: /^Move / })
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));

test('reorders panels by dragging a handle and keeps the order after a reload', async ({
  page,
}) => {
  const initial = await titles(page);
  expect(initial.slice(0, 3)).toEqual(['Move New graph', 'Move Examples', 'Move Import / export']);
  const handle = page.getByRole('button', { name: 'Move Layout' });
  const target = page.getByRole('button', { name: 'Move New graph' });
  const [from, to] = [(await handle.boundingBox())!, (await target.boundingBox())!];
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y - 10, { steps: 15 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const order = await titles(page);
      return order.slice(0, 2);
    })
    .toEqual(['Move Layout', 'Move New graph']);
  await page.reload();
  const reloaded = await titles(page);
  expect(reloaded.slice(0, 2)).toEqual(['Move Layout', 'Move New graph']);
});

test('reorders panels with the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Move Import / export' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByText(/moved over droppable area import/)).toHaveCount(1);
  // dnd-kit announces where the dragged panel is through a visually hidden live region. Its key
  // listeners attach a moment after pickup, so retry the first press if nothing was announced.
  await expect(async () => {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByText(/moved over droppable area layout/)).toHaveCount(1, {
      timeout: 1000,
    });
  }).toPass({ timeout: 10_000 });
  await page.keyboard.press('Space');
  await expect
    .poll(async () => {
      const order = await titles(page);
      return order.slice(0, 4);
    })
    .toEqual(['Move New graph', 'Move Examples', 'Move Layout', 'Move Import / export']);
});
