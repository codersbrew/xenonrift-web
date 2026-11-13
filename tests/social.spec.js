import { test, expect } from '@playwright/test';

// Community links remain available without JavaScript or third-party widgets.
test.use({ javaScriptEnabled: false });
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

const invite = 'https://discord.gg/wzFA9PURFw';
const linkName = 'Join Xenon Rift on Discord (opens in a new tab)';

async function expectDiscordLink(link) {
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', invite);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  const icon = link.locator('img');
  await expect(icon).toHaveAttribute('alt', '');
  await expect.poll(() => icon.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const bounds = await link.boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
}

for (const path of ['/', '/lore/', '/privacy/', '/terms/']) {
  test(`${path} footer has accessible Discord icon link`, async ({ page }) => {
    await page.goto(path);
    const link = page.getByRole('contentinfo')
      .getByRole('navigation', { name: 'Social links' })
      .getByRole('link', { name: linkName });
    await expectDiscordLink(link);
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.setViewportSize({ width: 320, height: 800 });
    await expectDiscordLink(link);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('homepage offers Discord beside playtest without replacing signup', async ({ page }) => {
  await page.goto('/');
  const actions = page.locator('.hero-copy .button-group');
  await expectDiscordLink(actions.getByRole('link', { name: linkName }));
  await expect(actions.getByRole('link', { name: 'Join the playtest' })).toHaveAttribute('href', '#play');
  await expect(page.locator('a[href*="MQEUH9Rcs"]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 800 });
  await expectDiscordLink(actions.getByRole('link', { name: linkName }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
