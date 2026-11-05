import { test, expect } from '@playwright/test';

// Functional checks do not depend on external font availability.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

test('page loads without errors, broken media, or horizontal overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your fight.');
  await page.evaluate(() => document.querySelectorAll('img').forEach(img => img.loading = 'eager'));
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('img:not(#lightbox-image)')]
    .every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('navigation and the current Fleet Battle screenshot resolve', async ({ page, request }) => {
  await page.goto('/');
  expect(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map(link => link.hash.slice(1)).filter(id => !document.getElementById(id)))).toEqual([]);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'The battle' }).click();
  await expect(page.locator('#fleet-battle')).toBeInViewport();
  for (const path of ['/images/gameplay/fleet.webp', '/images/gameplay/fleet-800.webp']) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
  const capture = page.locator('.capture-link img');
  await expect(capture).toHaveAttribute('width', '1600');
  await expect(capture).toHaveAttribute('height', '900');
  await expect(page.locator('figcaption')).toContainText('In-game development capture');
});

test('gameplay copy describes current fleets, factions, galaxy, and specials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-description')).toContainText('12v12 Fleet Battles');
  const battle = page.locator('#fleet-battle');
  await expect(page.locator('.hero-description')).toContainText('persistent galaxy');
  for (const fact of ['SOL ALLIANCE', 'ZHURAK HEGEMONY', 'carrier and two or three destroyers',
    'turrets and launch bays', 'No match clock', 'Team Deathmatch']) {
    await expect(battle).toContainText(fact);
  }
  const cards = page.locator('.ship-card');
  await expect(cards).toHaveCount(3);
  for (const special of ['PHASE DASH', 'WEAPON OVERCHARGE', 'PHOTON TORPEDOES']) await expect(page.locator('#ships')).toContainText(special);
  for (const retired of ['10v10', 'Cyan Vanguard', 'Ember Syndicate', 'Capture the Depot',
    'Offense vs Defense', 'BARRIER PULSE', 'session-only', 'Boost']) {
    await expect(page.locator('body')).not.toContainText(retired);
  }
});

test('metadata matches current gameplay and uses the current screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Xenon Rift — Your Ship. Your Fleet. Your Fight.');
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /12v12 Fleet Battles.*persistent galaxy/);
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    await expect(page.locator(selector)).toHaveAttribute('content', 'https://xenonrift.com/images/gameplay/fleet.webp');
  }
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://xenonrift.com/');
});

test('keyboard opens image dialog, traps focus, closes, and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('link', { name: 'Enlarge Fleet Battle capture' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Carrier, destroyers, and fighters');
  await expect(dialog.locator('img')).toHaveAttribute('alt', /cyan carrier and destroyers/);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Close image' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('playtest availability and Apple device requirements stay explicit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Join the playtest' }).click();
  await expect(page).toHaveURL(/#play$/);
  await expect(page.getByRole('heading', { name: 'Come help shape the Rift.' })).toBeInViewport();
  await expect(page.locator('.playtest-note')).toContainText('email app, not a download');
  await expect(page.locator('.playtest-note')).toContainText('requires a compatible controller');
  await expect(page.locator('.playtest-note')).toContainText('no touch flight controls');
  await expect(page.locator('.playtest-note')).toContainText('Siri Remote alone is not supported');
  for (const name of ['Request Mac playtest', 'Ask about Apple device testing']) {
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', /^mailto:support@codersbrew\.com\?subject=/);
  }
  expect(await page.locator('a[href*="releases/latest"], a[href*="testflight.apple.com"]').count()).toBe(0);
});

test('first-flight instructions use accounts and the galaxy, not manual server setup', async ({ page }) => {
  await page.goto('/');
  const steps = page.locator('.steps-grid');
  for (const fact of ['Practice', 'Google, Apple, or email', 'unique call sign', 'career stats',
    'Multiplayer', 'galactic map', 'Drop In', 'No server address to enter']) await expect(steps).toContainText(fact);
  expect(await page.locator('[data-copy], #server-address, #starfield').count()).toBe(0);
});

test('FAQ and controls explain persistence, offline play, and class specials', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Can I play without other players?', { exact: true }).click();
  await expect(page.getByText('Yes. Practice runs offline against bots', { exact: false })).toBeVisible();
  await page.getByText('Does the online galaxy keep going when I leave?', { exact: true }).click();
  await expect(page.getByText('The dedicated galaxy keeps its war state', { exact: false })).toBeVisible();
  await page.locator('.controls-panel summary').click();
  await expect(page.getByRole('table')).toBeVisible();
  const special = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Ship special' }) });
  await expect(special).toContainText('Space or Left Shift');
  await expect(special).toContainText('Either bumper');
  await expect(page.getByRole('table')).not.toContainText('Boost');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced-motion preference disables smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  expect(await page.locator('canvas').count()).toBe(0);
});
