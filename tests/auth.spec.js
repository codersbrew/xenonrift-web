import { test, expect } from '@playwright/test';

// The account pages talk to Supabase Auth; every call is intercepted here, so tests never reach the real project.
const AUTH = 'https://lrafvfnidgdvxhrphzau.supabase.co/auth/v1';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

/** Records Supabase calls and answers them with `reply(request)` → { status, body }. */
async function mockAuth(page, reply = () => ({ status: 200, body: {} })) {
  const calls = [];
  await page.route(`${AUTH}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors() });
    const call = { method: request.method(), url: request.url(), auth: request.headers().authorization, body: request.postDataJSON?.() ?? null };
    calls.push(call);
    const { status, body } = reply(call);
    await route.fulfill({ status, headers: { ...cors(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  });
  return calls;
}

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
}

async function expectCleanLayout(page, errors) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
}

test('confirmation link: confirmed, token removed from the address bar and its session revoked', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await mockAuth(page);
  await page.goto('/auth/confirmed/#access_token=tok-signup&expires_in=3600&refresh_token=r&token_type=bearer&type=signup');
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed.' })).toBeVisible();
  expect(page.url()).not.toContain('tok-signup');
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ method: 'POST', auth: 'Bearer tok-signup' });
  expect(calls[0].url).toBe(`${AUTH}/logout?scope=local`);
  await expectCleanLayout(page, errors);
});

test('confirmation link: expired link explained', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/auth/confirmed/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByRole('heading', { level: 1, name: 'That link didn’t work.' })).toBeVisible();
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible();
  expect(page.url()).not.toContain('otp_expired');
});

test('confirmation page without a link says what to do', async ({ page }) => {
  await page.goto('/auth/confirmed/');
  await expect(page.getByRole('heading', { level: 1, name: 'Confirm your email' })).toBeVisible();
});

test('a recovery link that landed on the Site URL goes to the reset page', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/auth/confirmed/#access_token=tok-recovery&type=recovery');
  await expect(page).toHaveURL(/\/auth\/reset\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeVisible();
});

test('reset: request a link', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await mockAuth(page);
  await page.goto('/auth/reset/');
  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter the email address you signed up with.');
  expect(calls).toEqual([]);
  await page.getByLabel('Email').fill('pilot@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Link on its way.' })).toBeVisible();
  await expect(page.getByText('pilot@example.com')).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe(`${AUTH}/recover?redirect_to=${encodeURIComponent('https://xenonrift.com/auth/reset/')}`);
  expect(calls[0].body).toEqual({ email: 'pilot@example.com' });
  await expectCleanLayout(page, errors);
});

test('reset: rate limit is explained', async ({ page }) => {
  await mockAuth(page, () => ({ status: 429, body: { error_code: 'over_email_send_rate_limit' } }));
  await page.goto('/auth/reset/');
  await page.getByLabel('Email').fill('pilot@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many requests');
});

test('reset: choose a new password with the link’s session, then revoke it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await mockAuth(page);
  await page.goto('/auth/reset/#access_token=tok-reset&expires_in=3600&type=recovery');
  await expect(page.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeVisible();
  expect(page.url()).not.toContain('tok-reset');

  await page.getByRole('textbox', { name: /^New password/ }).fill('short');
  await page.locator('input[name=confirm]').fill('short');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords are at least 8 characters.');
  await page.getByRole('textbox', { name: /^New password/ }).fill('long enough 1');
  await page.locator('input[name=confirm]').fill('long enough 2');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('The two passwords don’t match.');
  expect(calls).toEqual([]);

  await page.locator('input[name=confirm]').fill('long enough 1');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Password changed.' })).toBeVisible();
  expect(calls.map(c => [c.method, c.url, c.auth])).toEqual([
    ['PUT', `${AUTH}/user`, 'Bearer tok-reset'],
    ['POST', `${AUTH}/logout?scope=local`, 'Bearer tok-reset'],
  ]);
  expect(calls[0].body).toEqual({ password: 'long enough 1' });
  await expectCleanLayout(page, errors);
});

test('reset: same password and expired session', async ({ page }) => {
  let status = 422;
  await mockAuth(page, () => (status === 422
    ? { status, body: { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' } }
    : { status, body: { code: 401, error_code: 'session_expired', msg: 'Session expired' } }));
  await page.goto('/auth/reset/#access_token=tok-reset&type=recovery');
  await page.getByRole('textbox', { name: /^New password/ }).fill('old password');
  await page.locator('input[name=confirm]').fill('old password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('That’s your current password. Choose a different one.');

  status = 401;
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'That link didn’t work.' })).toBeVisible();
  await expect(page.getByText('This reset link has expired.')).toBeVisible();
  await page.getByRole('button', { name: 'Send a new link' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
});

test('reset: expired email link offers a new one', async ({ page }) => {
  await page.goto('/auth/reset/#error=access_denied&error_code=otp_expired');
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible();
  await page.getByRole('button', { name: 'Send a new link' }).click();
  await expect(page.getByLabel('Email')).toBeVisible();
});
