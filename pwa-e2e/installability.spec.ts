/* eslint-disable compat/compat -- This Chromium-only project deliberately verifies service-worker behavior. */
import { expect, test } from '@playwright/test';

test('serves a scoped installable manifest and fetchable exact-size icons', async({ request }) => {
  const response = await request.get('manifest.json');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/manifest+json');

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: './',
    scope: './',
    start_url: './',
    display: 'standalone',
    share_target: { action: 'share' },
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: 'pwa-icons/icon-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: 'pwa-icons/icon-512.png', sizes: '512x512', purpose: 'any maskable' }),
  ]));

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()['content-type']).toBe('image/png');
  }
});

test('controls the scoped app, reloads offline, and never rewrites API failures to HTML', async({ page, context }) => {
  await page.goto('.');
  await page.evaluate(async() => navigator.serviceWorker.ready);

  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 15_000 },
  ).toBe(true);

  await context.setOffline(true);
  const response = await page.goto('settings', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  expect(await page.locator('html').count()).toBe(1);

  const apiResult = await page.evaluate(async() => {
    try {
      const response = await fetch('/Mangane/api/v1/instance');
      return {
        contentType: response.headers.get('content-type'),
        status: response.status,
      };
    } catch {
      return { contentType: null, status: 'network-error' };
    }
  });
  expect(apiResult).toEqual({ contentType: null, status: 'network-error' });
});
