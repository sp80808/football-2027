import { test, expect } from '@playwright/test';

test('splash → menu → quick match → gameplay with scoreboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'FOOTBALL 2027' })).toBeVisible();
  await expect(page.getByText(/Press any key to/i)).toBeVisible({ timeout: 15_000 });

  await page.getByText(/Press any key to/i).click();

  await expect
    .poll(async () => page.evaluate(() => window.__TEST__?.screen))
    .toBe('mainMenu');

  await page.getByRole('button', { name: /Quick Match/i }).click();

  await expect
    .poll(async () => page.evaluate(() => window.__TEST__?.screen))
    .toBe('quickMatch');

  await page.getByRole('button', { name: /Play Match/i }).click({ timeout: 15_000 });

  await page.waitForFunction(() => window.__TEST__?.screen === 'gameplay', undefined, { timeout: 15_000 });

  await expect(page.getByText(/\d+:\d{2}/).first()).toBeVisible();

  const testState = await page.evaluate(() => window.__TEST__);
  expect(testState).toMatchObject({
    screen: 'gameplay',
    homeScore: 0,
    awayScore: 0,
  });
  expect(testState?.phase).toBeTruthy();
});
