const { test, expect } = require('@playwright/test');

/**
 * UI user flow test: validate a guest user can add a product to the cart,
 * increment and decrement quantity via backend requests, and see updated
 * cart UI reflecting those changes.
 */
test('cart flow lets a visitor add and adjust product quantity', async ({ page }) => {
  await page.goto('/catalog');

  const firstProductLink = page.locator('#productsContainer a[href^="/product/"]').first();
  await expect(firstProductLink).toBeVisible();

  await firstProductLink.click();
  await expect(page).toHaveURL(/\/product\/\d+/);

  const productId = await page.locator('main form[action="/cart/add"] input[name="productId"]').inputValue();

  await page.context().request.post('http://localhost:3000/cart/add', {
    form: { productId }
  });

  await page.goto('/cart');

  const cartRow = page.locator('table tbody tr').first();
  await expect(cartRow.locator('.order_name')).toBeVisible();
  await expect(cartRow.locator('.cart-quantity-count')).toHaveText('1');

  await page.context().request.post('http://localhost:3000/cart/add', {
    form: { productId }
  });
  await page.goto('/cart');
  await expect(cartRow.locator('.cart-quantity-count')).toHaveText('2');

  await page.context().request.post('http://localhost:3000/cart/remove', {
    form: { productId }
  });
  await page.goto('/cart');
  await expect(cartRow.locator('.cart-quantity-count')).toHaveText('1');

  await expect(page.locator('a[href="/checkout"]')).toBeVisible();
});