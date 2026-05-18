const { test, expect } = require('@playwright/test');

/**
 * UI smoke test: verify the home page renders main hero elements and that
 * at least one product link is present and visible. Uses Playwright page API.
 */
test('home page renders hero and product links', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Amigurumi Nest/);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a[href="/catalog"]')).toBeVisible();

  const productLinks = page.locator('a[href^="/product/"]');
  await expect(productLinks.first()).toBeVisible();
});