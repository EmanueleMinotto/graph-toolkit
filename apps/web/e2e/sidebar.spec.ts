import { expect, test } from '@playwright/test';
import { choose } from './helpers.js';

test.beforeEach(async ({ page }) => {
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
  await page.getByRole('combobox', { name: 'Algorithm', exact: true }).fill('planar');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Planarity test' }).click();
  await expect(page.getByRole('status')).toContainText('Planar');
});

test('collapses panels and remembers it after a reload', async ({ page }) => {
  const control = page.getByRole('button', { name: 'New graph' });
  await expect(page.getByLabel('Size')).toBeVisible();
  await control.click();
  await expect(page.getByLabel('Size')).toBeHidden();
  await page.reload();
  await expect(page.getByLabel('Size')).toBeHidden();
  await expect(page.getByLabel('Graph text')).toBeVisible();
  await page.getByRole('button', { name: 'New graph' }).click();
  await expect(page.getByLabel('Size')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Size')).toBeVisible();
  await choose(page, 'Layout', 'Circular');
});
