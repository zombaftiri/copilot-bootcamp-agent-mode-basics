const request = require('supertest');
const { app, db, insertStmt } = require('../src/app');

describe('DELETE /api/items/:id', () => {
  beforeEach(() => {
    // Clear the items table before each test
    db.prepare('DELETE FROM items').run();
    // Insert a test item
    insertStmt.run('Test Item');
  });

  it('should delete an existing item successfully', async () => {
    // Get the ID of our test item
    const item = db.prepare('SELECT * FROM items WHERE name = ?').get('Test Item');
    
    const response = await request(app)
      .delete(`/api/items/${item.id}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Item deleted successfully'
    });

    // Verify item was actually deleted from database
    const deletedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id);
    expect(deletedItem).toBeUndefined();
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