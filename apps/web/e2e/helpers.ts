import { expect, type Page } from '@playwright/test';

/** Opens the combobox called `label` and picks the option with the visible text `option`. */
export async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('combobox', { name: label, exact: true })).toHaveValue(option);
}
