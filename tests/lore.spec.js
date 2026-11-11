import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

test('lore page loads without errors, broken media, or horizontal overflow', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  const response = await page.goto('/lore/');
  expect(response.status()).toBe(200);

  await expect(page).toHaveTitle('Galactic Lore · Xenon Rift');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The Lore & Mythology');

  // Verify all page images resolve successfully
  const paths = await page.locator('link[rel=stylesheet], link[rel=icon], img').evaluateAll(elements =>
    elements.map(el => el.href || el.src).filter(url => new URL(url).origin === location.origin));
  for (const url of paths) {
    expect((await request.get(url)).ok(), url).toBe(true);
  }

  // Responsive check across device widths
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `width ${width}`).toBe(true);
  }

  expect(errors).toEqual([]);
});

test('lore metadata and canonical link are correctly configured', async ({ page }) => {
  await page.goto('/lore/');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://xenonrift.com/lore/');
  await expect(page.locator('meta[name=description]')).toHaveAttribute(
    'content',
    /The lore and mythology of Xenon Rift: The Great Departure/
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Galactic Lore · Xenon Rift');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://xenonrift.com/lore/');
});

test('all lore narrative sections and canon details are present', async ({ page }) => {
  await page.goto('/lore/');
  const article = page.getByRole('article');

  // Page I: The Great Departure & Aphelion Collective
  await expect(article).toContainText('The Great Departure (2188–2240)');
  await expect(article).toContainText('Deep-well Exodus');
  await expect(article).toContainText('Proxima, Ross 128, Luyten, and the seven-world chain of TRAPPIST-1');
  await expect(article).toContainText('cryogenic vaults for generations');
  await expect(article).toContainText('Earth, Luna, Mars, and the Jovian moons');
  await expect(article).toContainText('The arks made it.');

  // The Birth of the Aphelion Collective & Adaptation
  await expect(article).toContainText('The Birth of the Aphelion Collective');
  await expect(article).toContainText('tidally locked worlds');
  await expect(article).toContainText('The Low-G Frame');
  await expect(article).toContainText('exceeding seven feet in height');
  await expect(article).toContainText('Crimson & Dark Adaptation');
  await expect(article).toContainText('infrared spectrum');
  await expect(article).toContainText('Radiation Hardening');
  await expect(article).toContainText('synthetic DNA-repair enzymes');
  await expect(article).toContainText('Spindles');
  await expect(article).toContainText('Hollows');
  await expect(article).toContainText('Nobles');
  await expect(article).toContainText('Well-Bound');

  // Page II: The Noble Gas and the Burning Sky
  await expect(article).toContainText('PAGE II: THE NOBLE GAS AND THE BURNING SKY');
  await expect(article).toContainText('The Xenon Breakthrough (2590)');
  await expect(article).toContainText('Xe-142');
  await expect(article).toContainText('relativistic pinch reactor');
  await expect(article).toContainText('Xenon Rift');
  await expect(article).toContainText('Rift Sickness');
  await expect(article).toContainText('electric-violet vascular tracing');
  await expect(article).toContainText('12G combat turns');

  // The Catalyst of War & Opening Salvo
  await expect(article).toContainText('The Catalyst of War (2784 – Present)');
  await expect(article).toContainText('deep-core prospectors tapping the lower atmospheric bands of Jupiter and Saturn');
  await expect(article).toContainText('crude, massive Rift Gates');
  await expect(article).toContainText('The Opening Salvo');
  await expect(article).toContainText('outer Sol Relay at Neptune went dark');
  await expect(article).toContainText('Titan’s Xenon refineries');
  await expect(article).toContainText('You sit in the cockpit on the edge of the breach.');
});

test('lore copy contains no em dashes', async ({ page }) => {
  await page.goto('/lore/');
  expect(await page.locator('body').innerText()).not.toContain('—');
});

test('codex table of contents links resolve and jump to target sections', async ({ page }) => {
  await page.goto('/lore/');
  const toc = page.getByRole('navigation', { name: 'On this page' });
  const links = toc.getByRole('link');
  expect(await links.count()).toBe(6);

  // Verify all jump links point to elements that exist in the DOM
  const unresolved = await page.evaluate(() => {
    return [...document.querySelectorAll('.lore-toc a[href^="#"]')]
      .map(link => link.hash.slice(1))
      .filter(id => !document.getElementById(id));
  });
  expect(unresolved).toEqual([]);

  // Click on the last link and verify target in viewport
  await toc.getByRole('link', { name: 'The Opening Salvo' }).click();
  await expect(page.locator('#the-opening-salvo')).toBeInViewport();
});

test('skip link and keyboard navigation work properly', async ({ page }) => {
  await page.goto('/lore/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('navigation and footer links navigate cleanly', async ({ page }) => {
  await page.goto('/lore/');

  // Return to game home via wordmark
  await page.getByRole('banner').getByRole('link', { name: 'Xenon Rift home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your fight.');

  // Go back to lore
  await page.goto('/lore/');
  await page.getByRole('banner').getByRole('link', { name: 'Back to game site' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Footer navigation
  await page.goto('/lore/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '../privacy/');
  await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '../terms/');
  await expect(footer.getByRole('link', { name: /feedback/ })).toHaveAttribute(
    'href',
    'mailto:support@codersbrew.com?subject=Xenon%20Rift%20feedback'
  );
});

test('lore page works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());

  await page.goto(baseURL + '/lore/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The Lore & Mythology');
  await expect(page.getByRole('article')).toContainText('The Great Departure (2188–2240)');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'The Xenon Breakthrough (2590)' }).click();
  await expect(page.locator('#xenon-breakthrough')).toBeInViewport();
  await context.close();
});

test('home page links to lore from main navigation and footer', async ({ page }) => {
  await page.goto('/');
  const navLink = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Lore' });
  await expect(navLink).toBeVisible();
  await navLink.click();
  await expect(page).toHaveURL(/\/lore\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The Lore & Mythology');

  await page.goto('/');
  const footerLink = page.getByRole('contentinfo').getByRole('link', { name: 'Lore' });
  await expect(footerLink).toBeVisible();
  await footerLink.click();
  await expect(page).toHaveURL(/\/lore\/$/);
});
