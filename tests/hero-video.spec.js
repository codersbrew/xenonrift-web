import { test, expect } from '@playwright/test';

const videoPath = './videos/earth-fleet-gameplay.mp4';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

async function openHero(page) {
  await page.goto('/');
  await page.locator('.hero-visual').scrollIntoViewIfNeeded();
  return page.locator('#hero-video');
}

async function expectPlaying(page, video) {
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause gameplay video' })).toBeVisible();
}

test('muted inline video plays, pauses and resumes without hiding still link', async ({ page }) => {
  const video = await openHero(page);
  await expectPlaying(page, video);
  await expect(video).toHaveAttribute('src', videoPath);
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(video).toHaveJSProperty('playsInline', true);
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(0);
  expect(await video.evaluate(v => [v.videoWidth, v.videoHeight])).toEqual([1280, 720]);
  await page.getByRole('button', { name: 'Pause gameplay video' }).click();
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Play gameplay video' }).click();
  await expectPlaying(page, video);
  await page.getByRole('link', { name: 'Enlarge Fleet Battle capture' }).click();
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src', './images/gameplay/earth-fleet.webp');
});

test('reduced motion keeps responsive still and avoids video request until explicit play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', r => { if (r.url().includes('/videos/')) requests.push(r.url()); });
  const video = await openHero(page);
  await expect(page.getByRole('button', { name: 'Play gameplay video' })).toBeVisible();
  await expect(video).not.toHaveAttribute('src');
  await expect(video).toBeHidden();
  await expect(page.locator('.hero-media img')).toHaveAttribute('srcset', /earth-fleet-800.webp 800w/);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Play gameplay video' }).click();
  await expectPlaying(page, video);
});

for (const connection of [{ saveData: true, effectiveType: '4g' }, { saveData: false, effectiveType: '2g' }]) {
  test(`connection ${JSON.stringify(connection)} defaults to still without video download`, async ({ page }) => {
    await page.addInitScript(settings => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), settings) });
    }, connection);
    const video = await openHero(page);
    await expect(page.getByRole('button', { name: 'Play gameplay video' })).toBeVisible();
    await expect(video).not.toHaveAttribute('src');
    await expect(video).toBeHidden();
    await page.getByRole('button', { name: 'Play gameplay video' }).click();
    await expectPlaying(page, video);
  });
}

test('leaving viewport pauses video; returning resumes unless manually paused', async ({ page }) => {
  const video = await openHero(page);
  await expectPlaying(page, video);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty('paused', true);
  await page.locator('.hero-visual').scrollIntoViewIfNeeded();
  await expectPlaying(page, video);
  await page.getByRole('button', { name: 'Pause gameplay video' }).click();
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.locator('.hero-visual').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Play gameplay video' })).toBeVisible();
  await expect(video).toHaveJSProperty('paused', true);
});

test('changing reduced-motion preference stops running video', async ({ page }) => {
  const video = await openHero(page);
  await expectPlaying(page, video);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(video).toHaveJSProperty('paused', true);
  await expect(page.getByRole('button', { name: 'Play gameplay video' })).toBeVisible();
});

test('blocked autoplay leaves still and permits manual playback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      HTMLMediaElement.prototype.play = original;
      return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
    };
  });
  const video = await openHero(page);
  await expect(page.getByRole('button', { name: 'Play gameplay video' })).toBeVisible();
  await expect(video).toBeHidden();
  await page.getByRole('button', { name: 'Play gameplay video' }).click();
  await expectPlaying(page, video);
});

test('unavailable video keeps working still and removes broken playback control', async ({ page }) => {
  await page.route('**/videos/earth-fleet-gameplay.mp4', route => route.abort());
  const video = await openHero(page);
  await expect(page.getByRole('status')).toContainText('Gameplay video unavailable. Showing still image.');
  await expect(video).toBeHidden();
  await expect(page.locator('.hero-video-toggle')).toBeHidden();
  await expect(page.locator('.hero-media img')).toBeVisible();
  await page.getByRole('link', { name: 'Enlarge Fleet Battle capture' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('still and enlargement link work without downloading video', async ({ page }) => {
    const requests = [];
    page.on('request', r => { if (r.url().includes('/videos/')) requests.push(r.url()); });
    const video = await openHero(page);
    await expect(video).toBeHidden();
    await expect(page.locator('.hero-video-toggle')).toBeHidden();
    await expect(page.locator('.hero-media img')).toBeVisible();
    expect(requests).toEqual([]);
    await page.getByRole('link', { name: 'Enlarge Fleet Battle capture' }).click();
    await expect(page).toHaveURL(/\/images\/gameplay\/earth-fleet\.webp$/);
  });
});
