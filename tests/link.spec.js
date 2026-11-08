import { test, expect } from '@playwright/test';

// /link/: signing an Apple TV in. Supabase Auth and the device-link function are intercepted; nothing reaches the project.
const SUPABASE = 'https://lrafvfnidgdvxhrphzau.supabase.co';
const FUNCTION = `${SUPABASE}/functions/v1/device-link`;

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
}

/** Records Supabase calls (auth and functions) and answers with `reply(call)` → { status, body }. */
async function mockSupabase(page, reply) {
  const calls = [];
  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors() });
    const call = { method: request.method(), url: request.url(), auth: request.headers().authorization, body: request.postDataJSON?.() ?? null };
    calls.push(call);
    const { status, body } = reply(call);
    await route.fulfill({ status, headers: { ...cors(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  });
  return calls;
}

const session = { access_token: 'tok-web', refresh_token: 'r', user: { email: 'nova@example.com' } };

function backend({ goodCode = 'K7QX4MPT' } = {}) {
  return call => {
    if (call.url.includes('/token?grant_type=')) return { status: 200, body: session };
    if (call.url === FUNCTION) {
      return call.body.user_code === goodCode
        ? { status: 200, body: { ok: true, device_label: 'Apple TV' } }
        : { status: 404, body: { error: 'That code didn\'t work. Check the code on your TV; codes last 10 minutes and work once.' } };
    }
    return { status: 204, body: {} };
  };
}

test('the TV\'s QR code fills in the code and leaves the address bar clean', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/link/?tv=k7qx4mpt');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in your TV' })).toBeVisible();
  await expect(page.locator('#code-form [name=code]')).toHaveValue('K7QX-4MPT');
  expect(page.url()).not.toContain('k7qx4mpt');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('email: signs in, approves the code as the pilot, then revokes this page\'s session', async ({ page }) => {
  const calls = await mockSupabase(page, backend());
  await page.goto('/link/?tv=K7QX4MPT');
  await page.getByLabel('Email').fill('nova@example.com');
  await page.getByLabel('Password').fill('hunter22hunter');
  await page.getByRole('button', { name: 'Sign in and approve' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your TV is signing in.' })).toBeVisible();
  await expect.poll(() => calls.some(c => c.url.endsWith('/logout?scope=local'))).toBe(true);
  const approve = calls.find(c => c.url === FUNCTION);
  expect(approve).toMatchObject({ method: 'POST', auth: 'Bearer tok-web', body: { action: 'approve', user_code: 'K7QX4MPT' } });
  expect(calls.find(c => c.url.endsWith('/logout?scope=local')).auth).toBe('Bearer tok-web');
});

test('a mistyped code can be corrected without signing in again', async ({ page }) => {
  const calls = await mockSupabase(page, backend());
  await page.goto('/link/');
  await page.locator('#code-form [name=code]').fill('K7QX4MPX');
  await page.getByLabel('Email').fill('nova@example.com');
  await page.getByLabel('Password').fill('hunter22hunter');
  await page.getByRole('button', { name: 'Sign in and approve' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check the code' })).toBeVisible();
  await expect(page.getByText('That code didn\'t work.')).toBeVisible();
  await page.locator('#retry-form [name=code]').fill('k7qx-4mpt');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your TV is signing in.' })).toBeVisible();
  expect(calls.filter(c => c.url.includes('grant_type=password'))).toHaveLength(1);
});

test('Google / Apple: PKCE round trip comes back here and approves the remembered code', async ({ page }) => {
  const calls = await mockSupabase(page, backend());
  let authorize = '';
  await page.route(`${SUPABASE}/auth/v1/authorize**`, route => {
    authorize = route.request().url();
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>provider</p>' });
  });
  await page.goto('/link/?tv=K7QX4MPT');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect.poll(() => authorize).toContain('provider=google');
  const url = new URL(authorize);
  expect(url.searchParams.get('redirect_to')).toBe('https://xenonrift.com/link/');
  expect(url.searchParams.get('code_challenge_method')).toBe('s256');

  await page.goto('/link/?code=auth-code-123');
  await expect(page.getByRole('heading', { level: 1, name: 'Your TV is signing in.' })).toBeVisible();
  const exchange = calls.find(c => c.url.includes('grant_type=pkce'));
  expect(exchange.body.auth_code).toBe('auth-code-123');
  const digest = await page.evaluate(async verifier => {
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }, exchange.body.code_verifier);
  expect(digest).toBe(url.searchParams.get('code_challenge'));
  expect(calls.find(c => c.url === FUNCTION).body.user_code).toBe('K7QX4MPT');
  expect(page.url()).not.toContain('auth-code-123');
});

test('signing in needs the TV\'s code first', async ({ page }) => {
  const calls = await mockSupabase(page, backend());
  await page.goto('/link/');
  await page.getByRole('button', { name: 'Continue with Apple' }).click();
  await expect(page.getByText('Enter the 8-character code your TV shows first.')).toBeVisible();
  expect(calls).toEqual([]);
});
