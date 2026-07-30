import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const shellUrl = '/framework7-shell.html';

test.describe('Framework7 shell accessibility and recovery', () => {
  test('exposes one visible named navigation with one current destination', async({ page }) => {
    await page.goto(shellUrl);

    const visibleNavigationCount = await page.getByRole('navigation', { name: 'Primary navigation' }).evaluateAll((items) => (
      items.filter((item) => item.getClientRects().length > 0).length
    ));
    expect(visibleNavigationCount).toBe(1);

    const currentVisibleCount = await page.locator('[aria-current="page"]').evaluateAll((items) => (
      items.filter((item) => item.getClientRects().length > 0).length
    ));
    expect(currentVisibleCount).toBe(1);
  });

  test('announces offline state without replacing cached content', async({ page }) => {
    await page.goto(`${shellUrl}?offline=true`);
    await expect(page.getByRole('status')).toContainText('offline');
    await expect(page.getByRole('heading', { name: 'Framework7 shell parity fixture' })).toBeVisible();
  });

  test('provides named route recovery controls', async({ page }) => {
    await page.goto(`${shellUrl}?error=true`);
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('heading', { name: 'This page could not be displayed' })).toBeVisible();
    await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(alert.getByRole('button', { name: 'Go home' })).toBeVisible();
  });

  test('passes WCAG 2.2 AA checks', async({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'axe-core is not stable in the configured Firefox environment');
    await page.goto(shellUrl);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
