import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('User can sign up and is redirected to dashboard', async ({ page }) => {
    // Generate a unique email for each run so signup succeeds
    const uniqueEmail = `testuser_${Date.now()}@example.edu`;

    await page.goto('/');

    // Check if the page loaded
    await expect(page.getByRole('heading', { name: /Code. Clash. Conquer./i })).toBeVisible();

    // Fill in signup form
    await page.getByPlaceholder('Your name').fill('E2E Tester');
    await page.getByPlaceholder('College email').fill(uniqueEmail);
    
    // Select the first college (MIT is usually first in seed data)
    await page.locator('select').first().selectOption({ index: 0 });

    // Submit
    await page.getByRole('button', { name: /Join the Arena/i }).click();

    // After signup, dashboard is shown
    await expect(page.getByText('Quick Battle — Start Now')).toBeVisible({ timeout: 10000 });
    
    // Ensure we see our name
    await expect(page.getByText('E2E Tester')).toBeVisible();
  });

  test('User can sign in', async ({ page }) => {
    // Use one of the seeded users
    const seedEmail = 'johndoe@mit.edu';

    await page.goto('/');

    await page.getByPlaceholder('College email').nth(1).fill(seedEmail); // The second email input is for sign in
    await page.getByRole('button', { name: 'Sign In →' }).click();

    // After login, dashboard is shown
    await expect(page.getByText('Quick Battle — Start Now')).toBeVisible({ timeout: 10000 });
  });
});
