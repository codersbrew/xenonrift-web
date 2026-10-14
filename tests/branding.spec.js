import { test, expect } from '@playwright/test';

test('header and footer share original game wordmark without substitute icon', async ({ page }) => {
  await page.goto('/');
  const headerLogo = page.getByRole('banner').getByRole('img', { name: 'Xenon Rift', exact: true });
  const footerLogo = page.getByRole('contentinfo').getByRole('img', { name: 'Xenon Rift', exact: true });
  for (const logo of [headerLogo, footerLogo]) {
    await logo.scrollIntoViewIfNeeded();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', './images/brand/wordmark.webp');
    await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth === 830 && img.naturalHeight === 260)).toBe(true);
    const ratio = await logo.evaluate(img => img.clientWidth / img.clientHeight);
    expect(ratio).toBeCloseTo(830 / 260, 0);
  }
  expect(await page.locator('.brand svg').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('favicon and app icon use current PNG branding', async ({ page, request }) => {
  await page.goto('/');
  const iconPath = await page.locator('link[rel="icon"]').getAttribute('href');
  const touchPath = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(iconPath).toBe('./favicon.png');
  expect(touchPath).toBe('./apple-touch-icon.png');
  for (const [path, size] of [[iconPath, 128], [touchPath, 180]]) {
    const response = await request.get(new URL(path, 'http://127.0.0.1:4173/').href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    const data = await response.body();
    expect(data.readUInt32BE(16)).toBe(size);
    expect(data.readUInt32BE(20)).toBe(size);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest.icons[0]).toMatchObject({ src: './favicon.png', type: 'image/png', sizes: '128x128' });
});
