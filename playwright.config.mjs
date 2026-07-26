import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8090",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx expo start --web --port 8090",
    url: "http://127.0.0.1:8090",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, CI: "1" },
  },
});
