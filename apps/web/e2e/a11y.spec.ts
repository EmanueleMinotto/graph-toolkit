import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { choose } from './helpers.js';

const scan = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations.map(
    (violation) => `${violation.id}: ${violation.nodes.length} (${violation.help})`,
  );
};

for (const scheme of ['light', 'dark'] as const) {
  test(`has no WCAG A/AA violations in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    expect(await scan(page)).toEqual([]);
    await choose(page, 'Algorithm', 'Adjacency matrix');
    await expect(page.locator('output')).toContainText('Adjacency matrix');
    await page.getByText('Edit', { exact: true }).click();
    expect(await scan(page)).toEqual([]);
  });
}

test('vertices can be focused and selected with the keyboard', async ({ page }) => {
  await page.goto('/');
  const vertex = page.getByRole('button', { name: 'Vertex 2' });
  await vertex.focus();
  await page.keyboard.press('Enter');
  await expect(vertex).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Vertex 4' }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('circle.selected')).toHaveCount(2);
});
