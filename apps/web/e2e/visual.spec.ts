/// <reference types="node" />
import { expect, test } from '@playwright/test';

/**
 * Pixel snapshots depend on the OS font stack, so they are only compared where the baselines were
 * made. Create or refresh them with `VISUAL=1 pnpm e2e --update-snapshots` (CI: the Linux runner).
 */
test.skip(process.env['VISUAL'] === undefined, 'set VISUAL=1 to compare screenshots');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the default graph looks the same', async ({ page }) => {
  await page.evaluate(() => {
    globalThis.localStorage.clear();
  });
  await page.reload();
  await expect(page.locator('svg.graph')).toHaveScreenshot('default-cycle.png', {
    maxDiffPixelRatio: 0.02,
  });
});

test('an example in dark mode looks the same', async ({ page }) => {
  await page.getByRole('button', { name: /Petersen graph/ }).click();
  await page.getByRole('button', { name: 'Toggle color scheme' }).click();
  await page.getByRole('combobox', { name: 'Layout', exact: true }).click();
  await page.getByRole('option', { name: 'Circular', exact: true }).click();
  await expect(page.locator('svg.graph')).toHaveScreenshot('petersen-dark.png', {
    maxDiffPixelRatio: 0.02,
  });
});
