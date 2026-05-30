const { defineConfig, devices } = require("@playwright/test");
require("dotenv/config");

const isCI = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  // Run serially. These E2E specs share a single TEACHER_/STUDENT_ account and
  // a single test class against the live backend, so parallel workers would put
  // two browser sessions on the same account mutating the same assignment list
  // at once — causing list-render races (e.g. the publish-pill check) that look
  // like flake but are really self-contention. This is a test-harness
  // constraint, not a product concurrency limit: real users have distinct
  // accounts and data scopes.
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://praxiswrite.com",
    headless: isCI,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
