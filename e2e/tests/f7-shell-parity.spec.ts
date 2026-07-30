import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Framework7 shell parity fixture', () => {
  test.beforeEach(async({ page }) => {
    await page.goto('/f7-shell.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('uses the correct responsive shell structure', async({ page }) => {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const sidebar = page.locator('.sidebar');
    const tabs = page.locator('.tabs');
    const aside = page.locator('.aside');

    if ((viewport?.width ?? 0) < 768) {
      await expect(sidebar).toBeHidden();
      await expect(tabs).toBeVisible();
      await expect(aside).toBeHidden();
    } else if ((viewport?.width ?? 0) <= 1024) {
      await expect(sidebar).toBeVisible();
      await expect(tabs).toBeHidden();
      await expect(aside).toBeHidden();
    } else {
      await expect(sidebar).toBeVisible();
      await expect(tabs).toBeHidden();
      await expect(aside).toBeVisible();
    }
  });

  test('navigation preserves one selected destination and moves focus to content', async({ page }) => {
    const search = page.getByRole('button', { name: 'Search' }).first();
    await search.click();

    await expect(page.locator('#route-title')).toHaveText('Search');
    await expect(page.locator('[data-route="search"][aria-current="page"]')).toHaveCount(2);
    await expect(page.locator('[data-route="home"][aria-current="page"]')).toHaveCount(0);
    await expect(page.locator('#main')).toBeFocused();
    await expect(page).toHaveURL(/#search$/);
  });

  test('account switch resets route state without leaking the prior account', async({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Switch account' }).click();

    await expect(page.locator('#account')).toHaveText('Account Beta');
    await expect(page.locator('#route-title')).toHaveText('Home');
    await expect(page.locator('[data-route="home"][aria-current="page"]')).toHaveCount(2);
  });

  test('offline state is announced without removing cached content', async({ page }) => {
    const status = page.getByRole('status');
    await expect(status).toBeHidden();
    await page.getByRole('button', { name: 'Toggle offline' }).click();
    await expect(status).toBeVisible();
    await expect(status).toContainText('Cached content remains available');
    await expect(page.locator('.card')).toBeVisible();
  });

  test('legacy rollback control remains keyboard reachable', async({ page }) => {
    const rollback = page.getByRole('button', { name: 'Use legacy shell' });
    await rollback.focus();
    await expect(rollback).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-shell', 'legacy');
  });

  test('has no detectable WCAG 2.2 AA violations', async({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'axe-core is not stable in the current Firefox harness');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('interactive controls meet the 44px target contract', async({ page }) => {
    const controls = page.locator('button');
    for (let index = 0; index < await controls.count(); index += 1) {
      const box = await controls.nth(index).boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('reduced-motion project produces near-instant motion values', async({ page }) => {
    const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    test.skip(!reduced, 'Only applicable to the reduced-motion project');
    const duration = await page.locator('.shell').evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(['0s', '0.00001s']).toContain(duration);
  });
});
