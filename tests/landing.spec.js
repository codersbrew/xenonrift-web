import { test, expect } from '@playwright/test';

// Avoid depending on external font availability for functional checks.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

test('page loads without errors, broken media, or horizontal overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your fight.');
  // Load lazy images even below fold, then check every local image source.
  await page.evaluate(() => document.querySelectorAll('main img').forEach(img => img.loading = 'eager'));
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('main img')]
    .every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('all section links and full-size captures resolve', async ({ page, request }) => {
  await page.goto('/');
  const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map(link => link.hash.slice(1)).filter(id => !document.getElementById(id)));
  expect(missing).toEqual([]);
  const paths = await page.locator('[data-full]').evaluateAll(buttons => buttons.map(button => button.dataset.full));
  for (const path of paths) {
    const response = await request.get(new URL(path, 'http://127.0.0.1:4173/').href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
});

test('keyboard opens image dialog, traps focus, closes, and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Enlarge gameplay capture: faction combat at Xenon Outpost' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Faction combat at Xenon Outpost');
  await expect(dialog.locator('img')).toHaveAttribute('alt', /Cyan and Ember/);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Close image' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('copy address reports success and permission failure accessibly', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async text => { window.copiedAddress = text; } },
  }));
  await page.getByRole('button', { name: 'Copy address' }).click();
  await expect(page.getByRole('status')).toContainText('Server address copied');
  expect(await page.evaluate(() => window.copiedAddress)).toBe('game.xenonrift.com:7770');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new Error('Denied'); } },
  }));
  await page.getByRole('button', { name: 'Copy address' }).click();
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable');
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('game.xenonrift.com:7770');
});

test('playtest and platform limitations are clear with no dead download links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Join the playtest' }).click();
  await expect(page.locator('#get-game')).toBeInViewport();
  await expect(page.locator('.availability-banner')).toContainText('No public Mac download or TestFlight invite');
  await expect(page.locator('.controller-warning')).toContainText('No touch controls yet');
  await expect(page.getByRole('link', { name: 'Request Mac playtest' })).toHaveAttribute('href', /^mailto:/);
  await expect(page.getByRole('link', { name: 'Ask about iOS testing' })).toHaveAttribute('href', /^mailto:/);
  expect(await page.locator('a[href*="releases/latest"], a[href*="testflight.apple.com"], a[href="https://github.com/codersbrew/xenonrift"]').count()).toBe(0);
});

test('FAQ and controls open without script-dependent widgets', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Can I play without other players?', { exact: true }).click();
  await expect(page.getByText('Yes. Practice runs offline against bots', { exact: false })).toBeVisible();
  await page.locator('.controls-panel summary').click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion stops canvas animation, including preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const firstFrame = await page.locator('#starfield').evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(100);
  expect(await page.locator('#starfield').evaluate(canvas => canvas.toDataURL())).toBe(firstFrame);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(100);
  expect(await page.locator('#starfield').evaluate(canvas => canvas.toDataURL())).not.toBe(firstFrame);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const stopped = await page.locator('#starfield').evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(100);
  expect(await page.locator('#starfield').evaluate(canvas => canvas.toDataURL())).toBe(stopped);
});
