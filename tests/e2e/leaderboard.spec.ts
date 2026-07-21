import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test('Renders college standings correctly', async ({ page }) => {
    await page.goto('/leaderboard');

    // Verify header
    await expect(page.getByRole('heading', { name: /Global Standings/i })).toBeVisible();
    await expect(page.getByText('Season Zero')).toBeVisible();

    // The leaderboard should show the top colleges seeded in the database
    // For example, MIT, Stanford, Waterloo, IIT Bombay.
    // We just verify that at least one row exists by checking for "Points".
    await expect(page.getByText('Points')).toBeVisible();
    
    // Check if college rows are rendering
    const rows = page.locator('tbody tr');
    // Seed script ensures 4 colleges exist
    await expect(rows).toHaveCount(4); 
    
    // Check the first college row (the leader)
    await expect(rows.first().locator('td').nth(0)).toContainText('1'); // rank 1
    await expect(rows.first().locator('td').nth(1)).toBeVisible(); // Name
  });
});
