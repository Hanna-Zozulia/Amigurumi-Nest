const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./uiTestUtils');

test('guest users are redirected away from the admin area', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('form[action="/login"]')).toBeVisible();
});

test('admin can log in and reach dashboard, products, and comments', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await expect(page.locator('.admin-sidebar a[href="/admin/orders"]')).toBeVisible();
  await expect(page.locator('.admin-sidebar a[href="/admin/users"]')).toBeVisible();
  await expect(page.locator('.admin-sidebar a[href="/admin/products"]')).toBeVisible();
  await expect(page.locator('.admin-sidebar a[href="/admin/comments"]')).toBeVisible();

  await page.locator('.admin-sidebar a[href="/admin/products"]').click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.locator('a[href="/products/new"]')).toBeVisible();

  await page.locator('a[href="/products/new"]').click();
  await expect(page).toHaveURL(/\/products\/new$/);
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('textarea[name="desc"]')).toBeVisible();
  await expect(page.locator('input[name="price"]')).toBeVisible();
  await expect(page.locator('select[name="categoryId"]')).toBeVisible();

  await page.locator('.admin-sidebar a[href="/admin/comments"]').click();
  await expect(page).toHaveURL(/\/admin\/comments$/);
  await expect(page.locator('select[name="status"]')).toBeVisible();
  await expect(page.locator('form[action="/admin/comments"]')).toBeVisible();
  await expect(page.locator('select[name="sort"]')).toBeVisible();
  await expect(page.locator('input[name="q"]')).toBeVisible();
});