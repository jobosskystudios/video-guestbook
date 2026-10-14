// Smoke test in Chromium with a fake camera + mic (no real webcam needed).
// Run: npm test
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    browserName: 'chromium',
    viewport: { width: 1180, height: 820 }, // iPad Air landscape
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'npx serve . -l 3100 --no-clipboard',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
  },
});
