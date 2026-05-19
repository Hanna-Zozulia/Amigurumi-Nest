# Testing in Amigurumi-Nest

Complete guide for running, debugging, and maintaining project tests.

This file covers:
- unit, integration, e2e (Jest)
- UI tests (Playwright)
- code coverage
- test structure and mocks
- common issues and solutions

---

## Quick Start

```bash
# 1) Install dependencies
npm install

# 2) Run all Jest tests (unit + integration + e2e)
npm test

# 3) Generate coverage if needed
npm run test:coverage
```

For UI tests, use the dedicated commands in the section below.

---

## Requirements

- Node.js 14+
- npm 6+

Core testing packages already included in the project:
- jest
- supertest
- redis-mock
- jest-mock-extended
- @playwright/test
- puppeteer

---

## Test Commands

```bash
# All Jest tests
npm test

# Unit only
npm run test:unit

# Integration only
npm run test:integration

# e2e only (Jest)
npm run test:e2e

# Coverage
npm run test:coverage

# Playwright UI tests
npm run test:ui

# UI tests in interactive mode
npm run test:ui:dev
```

Notes:
- `npm test` uses `jest --forceExit --detectOpenHandles`.
- `test:e2e` runs with `--testTimeout=30000`.

---

## What Is Tested

### Unit
- middleware: auth, sessionTimeout, cacheMiddleware, and helper edge cases
- services: cacheService, orderService, emailService, profanityFilter, inactiveUsersService
- utils: cache and helper functions
- part of controller business scenarios

### Integration
- auth/cart/order/review/product controllers
- edge cases for authentication and cart
- admin scenarios

### E2E (Jest)
- auth flow
- checkout flow
- review flow
- API endpoints flow

### UI (Playwright)
- home page
- navigation
- user flow
- admin access checks

---

## Test Structure

- `tests/unit/` - unit tests
- `tests/integration/` - integration tests
- `tests/e2e/` - e2e tests on Jest
- `tests/ui/` - UI e2e tests on Playwright
- `tests/helpers/` - test setup, mocks, and utilities
- `tests/fixtures/` - test data

---

## Mocks and Test Environment

In `tests/helpers/setupTests.js`, environment variables are set for test mode and Jest mocks are cleared before each test.

Used mocks:
- Redis in-memory mock (`tests/helpers/redisMock.js`)
- Sequelize-like mock models (`tests/helpers/dbMock.js`)

Important:
- For Jest suites, the project is maximally isolated from real external services.
- Playwright UI tests run through a browser and real HTTP access to the application.

---

## Running UI Tests (Playwright)

In this project, `playwright.config.js` uses:
- `testDir: ./tests/ui`
- `baseURL: http://localhost:3000`
- `headless: false`

This means the application must be available at `http://localhost:3000` before running UI tests.

Recommended flow:

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run test:ui
```

---

## Code Coverage

Command:

```bash
npm run test:coverage
```

Jest collects coverage from these directories:
- `controllers/**/*.js`
- `middleware/**/*.js`
- `services/**/*.js`
- `utils/**/*.js`

Report location:
- `coverage/lcov-report/index.html`

---

## Useful Jest Parameters

```bash
# Watch mode
npm test -- --watch

# Specific test file
npm test -- tests/unit/utils/cache.test.js

# Filter by test name
npm test -- --testNamePattern="auth"

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

---

## Typical Workflow

1. Run quick checks:
	- `npm run test:unit`
2. Verify integration:
	- `npm run test:integration`
3. Run e2e on Jest:
	- `npm run test:e2e`
4. Run UI tests (if needed):
	- `npm run test:ui`
5. Before merge, collect coverage:
	- `npm run test:coverage`

---

## Troubleshooting

### Tests hang or do not finish
- Check that all async calls are awaited with `await`.
- Check open handles (connections, timers, sockets).
- Note that scripts already include `--forceExit` and `--detectOpenHandles`.

### Mocks are not working
- A mock must be set up before importing the module under test.
- Reset mocks in `beforeEach` via `jest.clearAllMocks()`.
- Make sure the correct helper from `tests/helpers/` is used.

### UI tests fail with connection errors
- Make sure the application is running at `http://localhost:3000`.
- Ensure the port is not occupied by another process.
- Re-run UI tests after the server starts.

### Coverage is not updating
- Run exactly `npm run test:coverage`.
- Remove the old `coverage/` folder and rerun if needed.

---

## CI Recommendations

- Run at minimum:
  - `npm test`
  - `npm run test:coverage`
- Run UI tests (`npm run test:ui`) in a separate CI job where the application and browser environment are started.

---

## Short Checklist Before PR

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E (Jest) pass
- [ ] UI tests are verified (if frontend/routing changed)
- [ ] Coverage is collected and did not drop for key modules

---

## Useful Links

- Jest: https://jestjs.io/
- Playwright: https://playwright.dev/
