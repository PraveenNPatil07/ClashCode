import { expect, test } from '@playwright/test';

test.describe('ClashCode smoke flow', () => {
  test('landing page explains the product and surfaces colleges', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Competitive coding, reframed as college warfare.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View leaderboard' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose your side' })).toBeVisible();
  });

  test('a seeded user can sign in and open a live battle', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('textbox', { name: /college email/i }).last().fill('aarav.mehta@apex.edu');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: /Welcome back, Aarav Mehta\./i })).toBeVisible();
    await page.getByRole('button', { name: 'Enter a battle now' }).click();

    await expect(page).toHaveURL(/\/battle\//);
    await expect(page.getByText('Battle Arena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit code' })).toBeVisible();
  });

  test('leaderboard route is reachable from the homepage CTA', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'View leaderboard' }).first().click();

    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  });
});
