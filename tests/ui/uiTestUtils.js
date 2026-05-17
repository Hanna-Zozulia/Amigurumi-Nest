require('dotenv').config();

const adminCredentials = {
  email: process.env.ADMIN_EMAIL || 'admin@test.com',
  password: process.env.ADMIN_PASSWORD || '123'
};

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#email').fill(adminCredentials.email);
  await page.locator('#password').fill(adminCredentials.password);
  await page.locator('form[action="/login"] button[type="submit"]').click();
  await page.waitForURL('**/');
}

module.exports = {
  adminCredentials,
  loginAsAdmin
};