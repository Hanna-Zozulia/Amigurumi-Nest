const { test, expect } = require('@playwright/test');

test('catalog page lists products and opens a product page', async ({ page }) => {
  await page.goto('/catalog');

  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('select[name="filter"]')).toBeVisible();

  const firstProductLink = page.locator('#productsContainer a[href^="/product/"]').first();
  await expect(firstProductLink).toBeVisible();

  await firstProductLink.click();

  await expect(page).toHaveURL(/\/product\/\d+/);
  await expect(page.locator('form[action="/cart/add"]')).toBeVisible();
  await expect(page.locator('main a[href="/catalog"]')).toBeVisible();
});