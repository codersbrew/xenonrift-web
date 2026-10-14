import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Reviewed Unity prefab renders from game revision 70f2e86, not cached pre-redesign art.
// Refresh hashes only after re-rendering and visually reviewing all three ships.
const ships = {
  interceptor: '16882334c96ff8a3ffeb8e96cb81b7e9f82a99a984b200781a96d34fb63d7d1a',
  striker: 'a4abfcfdc51c6591e5decd0c820f55770cc13d3a2a8fc3acd3e27e745d01e6a4',
  dreadnought: '16547542c94e4a372f0aded8439da547ac1d584e5b2b60db7b3c367c088abf32',
};

test('ship cards serve reviewed current-game renders', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.ship-card')).toHaveCount(3);
  for (const [name, hash] of Object.entries(ships)) {
    const path = `./images/ships/${name}.webp`;
    const response = await request.get(new URL(path, 'http://127.0.0.1:4173/').href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/webp');
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(hash);
    const card = page.locator('.ship-card').filter({ has: page.getByRole('heading', { name: name[0].toUpperCase() + name.slice(1), exact: true }) });
    await expect(card.locator('img')).toHaveAttribute('src', path);
  }
});

test('full ship images stay uncropped and undistorted at every breakpoint', async ({ page }) => {
  await page.goto('/#ships');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const img of await page.locator('.ship-card img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth === 720 && el.naturalHeight === 540)).toBe(true);
      const metrics = await img.evaluate(el => ({
        fit: getComputedStyle(el).objectFit,
        ratio: el.getBoundingClientRect().width / el.getBoundingClientRect().height,
      }));
      expect(metrics.fit).toBe('contain');
      expect(metrics.ratio).toBeCloseTo(4 / 3, 2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
