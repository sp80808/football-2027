import { test, expect } from '@playwright/test';

test('splash → menu → quick match → gameplay with scoreboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'FOOTBALL 2027' })).toBeVisible();
  await expect(page.getByText('Press any key to start')).toBeVisible();

  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: /Quick Match/i })).toBeVisible();

  await page.getByRole('button', { name: /Quick Match/i }).click();
  await expect(page.getByRole('heading', { name: 'Quick Match' })).toBeVisible();

  await page.getByRole('button', { name: /Play Match/i }).click();

  await expect
    .poll(async () => page.evaluate(() => window.__TEST__?.screen))
    .toBe('gameplay');

  await expect(page.getByText(/\d+:\d{2}/).first()).toBeVisible();

  const testState = await page.evaluate(() => window.__TEST__);
  expect(testState).toMatchObject({
    screen: 'gameplay',
    homeScore: 0,
    awayScore: 0,
  });
  expect(testState?.phase).toBeTruthy();
});
