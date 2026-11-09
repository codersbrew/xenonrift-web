import { test, expect } from '@playwright/test';

const documents = [
  { path: '/privacy/', title: 'Privacy Policy', other: '/terms/', otherTitle: 'Terms of Service' },
  { path: '/terms/', title: 'Terms of Service', other: '/privacy/', otherTitle: 'Privacy Policy' },
];
const support = 'support@codersbrew.com';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

for (const doc of documents) {
  test(doc.title + ': public document, metadata, navigation, and assets', async ({ page, request }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(doc.path);
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(doc.title + ' · Xenon Rift');
    await expect(page.getByRole('heading', { level: 1, name: doc.title, exact: true })).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://xenonrift.com' + doc.path);
    expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('meta[name=robots][content*=noindex]').count()).toBe(0);
    await expect(page.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    const toc = page.getByRole('navigation', { name: 'On this page' });
    expect(await toc.getByRole('link').count()).toBeGreaterThanOrEqual(8);
    expect(await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
      .map(link => link.hash.slice(1)).filter(id => !document.getElementById(id)))).toEqual([]);
    await toc.getByRole('link').last().click();
    await expect(page.locator('#changes')).toBeInViewport();
    const paths = await page.locator('link[rel=stylesheet], link[rel=icon], img').evaluateAll(elements =>
      elements.map(el => el.href || el.src).filter(url => new URL(url).origin === location.origin));
    for (const url of paths) expect((await request.get(url)).ok(), url).toBe(true);
    await page.getByRole('contentinfo').getByRole('link', { name: doc.otherTitle, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(doc.other + '$'));
    await page.getByRole('link', { name: 'Xenon Rift home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your fight.');
    expect(errors).toEqual([]);
  });

  test(doc.title + ': readable layout, keyboard access, and deletion contact', async ({ page }) => {
    await page.goto(doc.path);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'width ' + width).toBe(true);
      expect(await page.evaluate(() => document.querySelector('.legal-toc').getBoundingClientRect().top <=
        document.querySelector('.legal-copy').getBoundingClientRect().top), 'contents before article at width ' + width).toBe(true);
    }
    await expect(page.getByRole('article')).toContainText('Pilot Profile → Delete Account');
    await expect(page.getByRole('article').getByRole('link', { name: support, exact: true }).first())
      .toHaveAttribute('href', /^mailto:support@codersbrew\.com(?:\?|$)/);
    expect(await page.locator('script').count()).toBe(0);
  });
}

test('home and account pages link legal documents and use only new support address', async ({ page, request }) => {
  for (const path of ['/', '/auth/confirmed/', '/auth/reset/', ...documents.map(doc => doc.path)]) {
    await page.goto(path);
    const mailLinks = await page.locator('a[href^="mailto:"]').evaluateAll(links => links.map(link => link.getAttribute('href')));
    expect(mailLinks.length).toBeGreaterThan(0);
    for (const href of mailLinks) expect(href.split('?')[0]).toBe('mailto:' + support);
    await expect(page.locator('body')).not.toContainText('matthew@essenburg.com');
    const footer = page.getByRole('contentinfo');
    for (const doc of documents.filter(doc => doc.path !== path)) {
      const link = footer.getByRole('link', { name: doc.title, exact: true });
      await expect(link).toHaveCount(1);
      const url = new URL(await link.getAttribute('href'), page.url()).href;
      expect(new URL(url).pathname).toBe(doc.path);
      expect((await request.get(url)).status()).toBe(200);
    }
  }
  await page.goto('/');
  await page.getByText('Need help or want to report a bug?', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ask for help' })).toHaveAttribute('href', /\?subject=Xenon%20Rift%20help$/);
});

test('privacy explains real account data and external website services', async ({ page }) => {
  await page.goto('/privacy/');
  const article = page.getByRole('article');
  for (const disclosure of ['Supabase', 'Google Fonts', 'GitHub Pages', 'Apple', 'career statistics', 'do not sell personal information', 'local storage']) {
    await expect(article).toContainText(disclosure);
  }
});

test('legal documents and cross-links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.goto(baseURL + '/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
    await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Retention and account deletion' }).click();
    await expect(page).toHaveURL(/privacy\/#retention$/);
    await expect(page.locator('#retention')).toBeInViewport();
    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of Service');
  } finally {
    await context.close();
  }
});
