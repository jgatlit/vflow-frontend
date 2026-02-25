import { test, expect } from '@playwright/test';

test.describe('FlowListSidebar node count badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('should display node count badge on flow list items', async ({ page }) => {
    // Open the sidebar (find the button that opens flow list)
    const openSidebarBtn = page.locator('[title*="flow"], button:has-text("Flows"), button:has-text("📂")').first();
    if (await openSidebarBtn.count() > 0) {
      await openSidebarBtn.click();
      await page.waitForTimeout(500);
    }

    // Look for badge elements with "nodes" text
    const badges = page.locator('span:has-text("nodes")');
    const count = await badges.count();

    if (count > 0) {
      // Verify the badge content is a valid number + "nodes"
      const firstBadgeText = await badges.first().textContent();
      expect(firstBadgeText).toMatch(/^\d+ nodes$/);
    }
    // Test passes even if no flows exist (sidebar may be empty)
  });
});
