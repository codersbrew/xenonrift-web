import { test, expect } from '@playwright/test';

// TestFlight waitlist calls are intercepted so browser tests never hit the live Supabase project.
const SUPABASE = 'https://lrafvfnidgdvxhrphzau.supabase.co';
const SIGNUP_URL = `${SUPABASE}/functions/v1/testflight-signup`;

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  };
}

async function mockSignup(page, reply) {
  const calls = [];
  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors() });
    const call = {
      method: request.method(),
      url: request.url(),
      apikey: request.headers().apikey,
      body: request.postDataJSON?.() ?? null,
    };
    calls.push(call);
    const { status, body } = reply(call);
    await route.fulfill({
      status,
      headers: { ...cors(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  });
  return calls;
}

test('validates email and Apple device selection before calling Supabase', async ({ page }) => {
  const calls = await mockSignup(page, () => ({ status: 200, body: { ok: true } }));
  await page.goto('/#play');

  const form = page.locator('#testflight-form');
  await form.getByRole('button', { name: 'Join TestFlight list' }).click();
  await expect(form.getByRole('alert')).toHaveText('Enter the email address you use with Apple TestFlight.');
  expect(calls).toEqual([]);

  await form.getByLabel('Apple ID email').fill('pilot@example.com');
  await form.getByLabel('iPhone').uncheck();
  await form.getByRole('button', { name: 'Join TestFlight list' }).click();
  await expect(form.getByRole('alert')).toHaveText('Choose at least one Apple device.');
  expect(calls).toEqual([]);
});

test('submits normalized email and chosen Apple devices, confirms, and allows updating', async ({ page }) => {
  const calls = await mockSignup(page, call => ({
    status: 200,
    body: { ok: true, platforms: call.body.platforms },
  }));

  await page.goto('/#play');
  const card = page.locator('#testflight-signup');
  await card.getByLabel('Apple ID email').fill('  Pilot.One@Example.COM ');
  await card.getByLabel('Apple TV').check();
  await card.getByRole('button', { name: 'Join TestFlight list' }).click();

  await expect(card.getByRole('heading', { name: 'TestFlight request saved.' })).toBeVisible();
  await expect(card).toContainText('pilot.one@example.com');
  await expect(card).toContainText('iPhone and Apple TV');
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    method: 'POST',
    url: SIGNUP_URL,
    body: {
      email: 'pilot.one@example.com',
      platforms: ['iphone', 'apple_tv'],
      company: '',
    },
  });
  expect(calls[0].apikey).toBeTruthy();

  await card.getByRole('button', { name: 'Update devices or use a different email' }).click();
  await expect(card.getByLabel('Apple ID email')).toBeVisible();
  await expect(card.getByLabel('Apple ID email')).toBeFocused();
});

test('rate limit displays retry guidance without exposing fallback mailto', async ({ page }) => {
  await mockSignup(page, () => ({
    status: 429,
    body: { error: 'Too many signup requests from this connection. Wait a bit and try again.' },
  }));

  await page.goto('/#play');
  const form = page.locator('#testflight-form');
  await form.getByLabel('Apple ID email').fill('pilot@example.com');
  await form.getByRole('button', { name: 'Join TestFlight list' }).click();

  await expect(form.getByRole('alert')).toContainText('Too many signup requests');
  await expect(form.locator('.testflight-fallback')).toBeHidden();
});

test('backend outage offers a pre-filled support@codersbrew.com fallback link', async ({ page }) => {
  await mockSignup(page, () => ({
    status: 503,
    body: { error: 'Function unavailable' },
  }));

  await page.goto('/#play');
  const form = page.locator('#testflight-form');
  await form.getByLabel('Apple ID email').fill('wingman@example.com');
  await form.getByLabel('iPad').check();
  await form.getByRole('button', { name: 'Join TestFlight list' }).click();

  await expect(form.getByRole('alert')).toContainText('Online signup isn’t available right now');
  const fallback = form.getByRole('link', { name: /Send your TestFlight request via email app instead/ });
  await expect(fallback).toBeVisible();
  const href = await fallback.getAttribute('href');
  expect(href).toMatch(/^mailto:support@codersbrew\.com\?/);
  expect(decodeURIComponent(href)).toContain('wingman@example.com');
  expect(decodeURIComponent(href)).toContain('iPhone and iPad');
});
