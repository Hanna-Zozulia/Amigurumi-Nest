const { test, expect } = require('@playwright/test');

test('home page renders hero and product links', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Amigurumi Nest/);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a[href="/catalog"]')).toBeVisible();

  const productLinks = page.locator('a[href^="/product/"]');
  await expect(productLinks.first()).toBeVisible();
});