const { test, expect } = require('@playwright/test');

/**
 * End-to-End tests for delete item functionality
 * 
 * These tests verify that users can successfully delete items from the application.
 */

test.describe('Delete Item Functionality', () => {
  
  test('should display delete buttons and successfully delete an item', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Hello World');
    
    // Ensure we have test data by adding an item if needed
    const hasTable = await page.locator('table').isVisible();
    if (!hasTable) {
      await page.fill('input[placeholder="Enter item name"]', 'Test Item for Delete');
      await page.click('button:has-text("Add Item")', { force: true });
      await page.waitForTimeout(2000);
    }
    
    // Wait for table to be visible
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Check if there are any items with delete buttons
    const deleteButtons = page.locator('button:has-text("Delete")');
    const buttonCount = await deleteButtons.count();
    
    // Verify delete buttons are present (there should be initial items)
    expect(buttonCount).toBeGreaterThan(0);
    console.log(`Found ${buttonCount} delete buttons`);
    
    // Verify the first delete button has proper attributes
    const firstDeleteButton = deleteButtons.first();
    await expect(firstDeleteButton).toBeVisible();
    
    const ariaLabel = await firstDeleteButton.getAttribute('aria-label');
    expect(ariaLabel).toContain('Delete');
    
    const testId = await firstDeleteButton.getAttribute('data-testid');
    expect(testId).toMatch(/delete-button-\d+/);
    
    // Get initial item count
    const itemRows = page.locator('table tbody tr');
    const initialCount = await itemRows.count();
    console.log(`Initial item count: ${initialCount}`);
    
    // Get the name of the first item to verify deletion
    const firstItemName = await page.locator('table tbody tr').first().locator('td').first().textContent();
    console.log(`First item name: ${firstItemName}`);
    
    // Click the delete button for the first item
    await firstDeleteButton.click({ force: true });
    
    // Wait for the deletion to complete
    await page.waitForTimeout(2000);
    
    // Verify the item count decreased
    const newCount = await itemRows.count();
    console.log(`New item count: ${newCount}`);
    expect(newCount).toBe(initialCount - 1);
    
    // Verify the specific item is no longer present in the table
    const itemCells = page.locator('table tbody tr td:first-child');
    await expect(itemCells.filter({ hasText: firstItemName })).toHaveCount(0);
    
    console.log('Delete test completed successfully');
  });

  test('should add and delete a custom item', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Enter item name"], table', { timeout: 10000 });
    
    // Add a new test item
    const testItemName = `E2E Test Item ${Date.now()}`;
    console.log(`Adding test item: ${testItemName}`);
    
    await page.fill('input[placeholder="Enter item name"]', testItemName);
    await page.click('button:has-text("Add Item")', { force: true });
    
    // Wait for the item to be added
    await page.waitForTimeout(2000);
    
    // Verify the item was added
    await expect(page.locator(`text=${testItemName}`)).toBeVisible();
    console.log('Test item successfully added');
    
    // Find and click the delete button for our test item
    const testItemRow = page.locator('tr', { has: page.locator(`text=${testItemName}`) });
    const deleteButton = testItemRow.locator('button:has-text("Delete")');
    
    await expect(deleteButton).toBeVisible();
    await deleteButton.click({ force: true });
    
    // Wait for deletion to complete
    await page.waitForTimeout(2000);
    
    // Verify the item was deleted
    await expect(page.locator(`text=${testItemName}`)).not.toBeVisible();
    console.log('Test item successfully deleted');
  });

  test('should handle empty state correctly after deleting all items', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Enter item name"], table', { timeout: 10000 });
    
    // Add a test item first to ensure we have something to delete
    await page.fill('input[placeholder="Enter item name"]', 'Item to Delete');
    await page.click('button:has-text("Add Item")', { force: true });
    await page.waitForTimeout(2000);
    
    // Delete all existing items if any
    let deleteButtons = page.locator('button:has-text("Delete")');
    let buttonCount = await deleteButtons.count();
    console.log(`Found ${buttonCount} items to delete`);
    
    while (buttonCount > 0) {
      await deleteButtons.first().click({ force: true });
      await page.waitForTimeout(1500);
      
      deleteButtons = page.locator('button:has-text("Delete")');
      buttonCount = await deleteButtons.count();
      console.log(`Remaining items: ${buttonCount}`);
    }
    
    // Verify empty state is displayed
    await expect(page.locator('text=No items found. Add some!')).toBeVisible();
    console.log('Empty state displayed correctly');
    
    // Verify table is not displayed when empty
    await expect(page.locator('table')).not.toBeVisible();
    console.log('Table hidden when no items');
  });
});
