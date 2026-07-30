import { test, expect } from '@playwright/test';

const shellUrl = '/framework7-shell.html';

const expectedLayout = (width: number): 'phone' | 'tablet' | 'desktop' => {
  if (width < 768) return 'phone';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};

test.describe('Framework7 shell adaptive layout', () => {
  test('selects the expected layout without horizontal overflow', async({ page }) => {
    await page.goto(shellUrl);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    await expect(page.getByTestId('f7-shell')).toHaveAttribute(
      'data-layout',
      expectedLayout(viewport!.width),
    );

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test('hides phone tabs while the virtual keyboard is visible', async({ page }) => {
    await page.goto(`${shellUrl}?layout=phone&keyboard=true`);
    await expect(page.getByTestId('f7-shell')).toHaveAttribute('data-keyboard', 'true');
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
  });

  test('keeps the legacy rollback path independent', async({ page }) => {
    await page.goto(`${shellUrl}?legacy=true`);
    await expect(page.getByTestId('legacy-shell')).toBeVisible();
    await expect(page.getByTestId('f7-shell')).toBeHidden();
  });

  test('uses near-instant transitions under reduced motion', async({ page }) => {
    await page.goto(shellUrl);
    const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    const duration = await page.getByTestId('f7-shell').evaluate((element) => (
      getComputedStyle(element).transitionDuration
    ));

    if (reduced) expect(duration).toBe('0.00001s');
    else expect(duration).not.toBe('0.00001s');
  });
});
