import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Fresh Unity 6000.3.27f2 prefab renders from game revision 3730af5, 2026-11-13.
// Identical gameplay camera and scale; crop (360, 105, 1240, 765) preserves all six hulls.
// Refresh hashes only after rendering and reviewing every ship.
const ships = {
  interceptor: '4d812b66c9682faae638305c5ccfc78d32ea62817e0ae9104699b048e07f6069',
  striker: '7bff2a2ac5bee414a7b5b85b8a9f2b6d6fa71647b959e46af37f95be96ec6e15',
  dreadnought: '321adc163579d4e824e2ef76cf1b0c3180dd7412b75b5e5806e8a22a1ca5ead3',
  scythe: '9a03a013b3c598bf4bc11d6851273b9f74873b12a8b5e3ff2163e87bf24bdadd',
  crescent: '623247f98eab265dc3c3e17f6f4ff8b39bc7d6c8a3dad0b72070ca46cbc86950',
  juggernaut: '3d4ffd9cce1291f879330581c27aa59a7e2cd442a8bc95f21b15cebacbd8d4ac',
};

test('ship cards serve reviewed current-game renders', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.ship-card')).toHaveCount(6);
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

test('faction hulls share three class loadouts, not six different balance profiles', async ({ page }) => {
  await page.goto('/#ships');
  const sol = page.getByRole('region', { name: 'Sol Alliance', exact: true });
  const aphelion = page.getByRole('region', { name: 'Aphelion Collective', exact: true });
  await expect(sol.locator('.ship-card')).toHaveCount(3);
  await expect(aphelion.locator('.ship-card')).toHaveCount(3);
  for (const [kind, solName, aphelionName] of [
    ['interceptor', 'Interceptor', 'Scythe'],
    ['striker', 'Striker', 'Crescent'],
    ['dreadnought', 'Dreadnought', 'Juggernaut'],
  ]) {
    const blue = sol.locator(`[data-class="${kind}"]`);
    const pink = aphelion.locator(`[data-class="${kind}"]`);
    await expect(blue.getByRole('heading', { level: 4 })).toHaveText(solName);
    await expect(pink.getByRole('heading', { level: 4 })).toHaveText(aphelionName);
    expect(await blue.locator('.ability').allTextContents()).toEqual(await pink.locator('.ability').allTextContents());
    expect(await blue.locator('img').getAttribute('src')).not.toBe(await pink.locator('img').getAttribute('src'));
  }
  await expect(page.locator('#ships')).toContainText('matching weapons, specials, and class balance');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('both faction lineups remain available', async ({ page }) => {
    await page.goto('/#ships');
    for (const name of Object.keys(ships)) {
      const card = page.locator('.ship-card').filter({ has: page.getByRole('heading', { name: name[0].toUpperCase() + name.slice(1), exact: true }) });
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth === 720)).toBe(true);
    }
  });
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
