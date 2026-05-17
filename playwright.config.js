const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ui',

  timeout: 30000,

  use: {
    browserName: 'chromium',
    headless: false,
    baseURL: 'http://localhost:3000'
  }
});