import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('core content, playtest links, FAQ, and controls remain usable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your fight.');
    await page.getByRole('link', { name: 'Join the playtest' }).click();
    await expect(page.getByRole('link', { name: 'Request Mac playtest' })).toHaveAttribute('href', /^mailto:/);
    await page.locator('.controls-panel summary').click();
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByText('Can I play without other players?', { exact: true }).click();
    await expect(page.getByText('Yes. Practice runs offline against bots', { exact: false })).toBeVisible();
  });
});

test('image clicks keep dialog open; backdrop closes it', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Enlarge gameplay capture: faction combat at Xenon Outpost' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('img').click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
