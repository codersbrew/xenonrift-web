import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

// Shape written by Tools/publish-release-notes.py (game repo).
const entry = (id, title, date, build, sections) => ({
  id, title, date, version: '0.1.0', build, platforms: ['ios', 'tvos', 'macos'], sections,
});
const DATA = {
  updates: [
    entry('build-261120-1530', 'Fleet Night build — Nov 20', '2026-11-20', '261120.1530', [
      { heading: null, blocks: [{ kind: 'p', items: ['Thanks for flying with us.'] }] },
      { heading: "What's new", blocks: [{ kind: 'ul', items: [
        'Defense wins open **counterattacks**',
        'Read [the lore](https://xenonrift.com/lore/) and ask in <#1570850361424486611>',
        'Use `Phase Dash` to dodge',
      ] }] },
      { heading: 'Known issues', blocks: [{ kind: 'ul', items: ['No reconnect yet'] }] },
    ]),
    entry('build-261101-1000', '<img src=x onerror="window.pwned=1">Hostile', '2026-11-01', '261101.1000', [
      { heading: '<script>window.pwned=2</script>', blocks: [{ kind: 'ul', items: [
        '[click](javascript:window.pwned=3)', '[plain](http://example.com)',
      ] }] },
    ]),
  ],
};

const serve = (page, body, status = 200) =>
  page.route('**/updates.json', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));

test('updates page loads its empty state without errors or overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/updates/');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Updates · Xenon Rift');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://xenonrift.com/updates/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Updates');
  await expect(page.locator('#updates')).toContainText('No playtest builds posted yet');
  await expect(page.locator('#updates')).toHaveAttribute('aria-busy', 'false');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `width ${width}`).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('entries render newest first with formatting, platforms and anchors', async ({ page }) => {
  await serve(page, DATA);
  await page.goto('/updates/');
  const entries = page.locator('article.update-entry');
  await expect(entries).toHaveCount(2);
  const first = entries.first();
  await expect(first).toHaveAttribute('id', 'build-261120-1530');
  await expect(first.getByRole('heading', { level: 2 })).toHaveText('Fleet Night build — Nov 20');
  await expect(first.getByRole('link', { name: 'Fleet Night build — Nov 20' })).toHaveAttribute('href', '#build-261120-1530');
  await expect(first.locator('time')).toHaveText('Nov 20, 2026');
  await expect(first.locator('time')).toHaveAttribute('datetime', '2026-11-20');
  await expect(first).toContainText('Version 0.1.0 · build 261120.1530');
  await expect(first.getByRole('list', { name: 'Platforms' }).getByRole('listitem')).toHaveText(['iPhone & iPad', 'Apple TV', 'Mac']);
  await expect(first.getByRole('heading', { level: 3 })).toHaveText(["What's new", 'Known issues']);
  await expect(first.locator('strong')).toHaveText('counterattacks');
  await expect(first.locator('code')).toHaveText('Phase Dash');
  await expect(first.getByRole('link', { name: 'the lore' })).toHaveAttribute('href', 'https://xenonrift.com/lore/');
  await expect(first).toContainText('and ask in Discord');

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `width ${width}`).toBe(true);
  }
});

test('notes text can never become markup or unsafe links', async ({ page }) => {
  await serve(page, DATA);
  await page.goto('/updates/');
  const hostile = page.locator('article.update-entry').nth(1);
  await expect(hostile.getByRole('heading', { level: 2 })).toHaveText('<img src=x onerror="window.pwned=1">Hostile');
  await expect(hostile.getByRole('heading', { level: 3 })).toHaveText('<script>window.pwned=2</script>');
  await expect(hostile.locator('img, script')).toHaveCount(0);
  await expect(hostile.locator('.update-section a')).toHaveCount(0);  // javascript: and http: stay plain text
  await expect(hostile).toContainText('[click](javascript:window.pwned=3)');
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test('a failed load says so and points to Discord', async ({ page }) => {
  await serve(page, {}, 500);
  await page.goto('/updates/');
  await expect(page.locator('#updates-status')).toHaveText(/could not be loaded.*Discord/);
});

test('home and lore footers link to updates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Updates', exact: true }).click();
  await expect(page).toHaveURL(/\/updates\/$/);
  await page.goto('/lore/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Updates', exact: true })).toHaveAttribute('href', '../updates/');
});
