const request = require('supertest');
const { app, db, insertStmt } = require('../src/app');

describe('DELETE /api/items/:id', () => {
  beforeEach(() => {
    // Clear the items table before each test
    db.prepare('DELETE FROM items').run();
  });

  const insertItemWithDate = (name, daysAgo) => {
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return db.prepare('INSERT INTO items (name, created_at) VALUES (?, ?)')
      .run(name, date.toISOString());
  };

  it('should delete an item that is older than 5 days', async () => {
    // Insert item that's 6 days old
    const result = insertItemWithDate('Old Item', 6);
    const itemId = result.lastInsertRowid;
    
    const response = await request(app)
      .delete(`/api/items/${itemId}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Item deleted successfully'
    });

    // Verify item was actually deleted from database
    const deletedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    expect(deletedItem).toBeUndefined();
  });

  it('should not allow deleting items less than 5 days old', async () => {
    // Insert item that's 3 days old
    const result = insertItemWithDate('Recent Item', 3);
    const itemId = result.lastInsertRowid;

    const response = await request(app)
      .delete(`/api/items/${itemId}`)
      .expect(403);

    expect(response.body).toEqual({
      error: 'Items can only be deleted after 5 days'
    });

    // Verify item still exists in database
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    expect(item).toBeDefined();
    expect(item.name).toBe('Recent Item');
  });

  it('should return 404 when trying to delete non-existent item', async () => {
    const nonExistentId = 9999;

    const response = await request(app)
      .delete(`/api/items/${nonExistentId}`)
      .expect(404);

    expect(response.body).toEqual({
      error: 'Item not found'
    });
  });

  it('should handle invalid ID format gracefully', async () => {
    const response = await request(app)
      .delete('/api/items/invalid-id')
      .expect(404);

    expect(response.body).toEqual({
      error: 'Item not found'
    });
  });
});