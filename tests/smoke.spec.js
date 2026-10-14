// End-to-end smoke test: record one of each mode with Chromium's fake camera/mic,
// then open the hidden admin with the PIN and check the Gallery.
const { test, expect } = require('@playwright/test');

// Fast settings for the test run (kept only in this test browser's localStorage).
const TEST_SETTINGS = { countdown: 0, reviewAutoSave: 0, minSeconds: 1, askName: true, showPrompts: true, pin: '1234' };

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('vg.settings')) localStorage.setItem('vg.settings', JSON.stringify(s));
  }, TEST_SETTINGS);
});

async function record(page, mode, guest) {
  await page.locator(`.mode-btn[data-mode="${mode}"]`).click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'name');
  await page.locator('#guest-name').fill(guest);
  await page.locator('#name-next').click();
  if (mode === 'video' || mode === 'audio') {
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'prompt');
    await page.locator('#prompt-use').click();
  }
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'live');
  await page.locator('#shutter').click();
  if (mode === 'video' || mode === 'audio') {
    await expect(page.locator('#rec-badge')).toBeVisible();
    await page.waitForTimeout(2500);
    await page.locator('#shutter').click(); // stop
  }
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'review', { timeout: 30_000 });
  await page.locator('#review-save').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'thanks');
  await page.locator('#s-thanks').click(); // back to welcome
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'attract');
}

test('records every mode and shows them in the Gallery', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mode-btn')).toHaveCount(4);
  await page.waitForFunction(() => document.querySelector('#cam').videoWidth > 0, null, { timeout: 20_000 }); // camera live
  await expect(page.locator('#a-error')).toBeHidden();

  await record(page, 'video', 'Video Guest');
  await record(page, 'audio', 'Voice Guest');
  await record(page, 'photo', 'Photo Guest');
  await record(page, 'boomerang', 'Boomerang Guest');

  // Every saved clip has real data in IndexedDB.
  const clips = await page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('video-guestbook');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const q = r.result.transaction('clips').objectStore('clips').getAll();
      q.onsuccess = () => res(q.result.map((c) => ({ type: c.type, mime: c.mime, size: c.size, guest: c.guestName })));
    };
  }));
  console.log('Saved clips:', clips);
  expect(clips.map((c) => c.type).sort()).toEqual(['audio', 'boomerang', 'photo', 'video']);
  for (const c of clips) expect(c.size, `${c.type} is empty`).toBeGreaterThan(1000);

  // Hidden admin: 5 taps in the top-left corner, then the PIN.
  for (let i = 0; i < 5; i++) await page.locator('#hotspot').click();
  await expect(page.locator('#m-pin')).toBeVisible();
  for (const k of '1234') await page.locator('#keypad button', { hasText: new RegExp(`^${k}$`) }).click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'admin');

  await page.locator('#admin-tabs button', { hasText: 'Gallery' }).click();
  await expect(page.locator('.gallery .clip')).toHaveCount(4);
  for (const name of ['Video Guest', 'Voice Guest', 'Photo Guest', 'Boomerang Guest']) {
    await expect(page.locator('.gallery .clip', { hasText: name })).toHaveCount(1);
  }
});

test('wrong PIN keeps the admin locked', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 5; i++) await page.locator('#hotspot').click();
  for (const k of '9999') await page.locator('#keypad button', { hasText: new RegExp(`^${k}$`) }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('body')).not.toHaveAttribute('data-screen', 'admin');
});

test('keeps working offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#a-names')).toHaveText('Aarav & Diya');
  await expect(page.locator('#a-studio-logo')).toBeVisible(); // logo is in the offline cache
  expect(await page.locator('#a-studio-logo').evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.mode-btn')).toHaveCount(4);
  await context.setOffline(false);
});
