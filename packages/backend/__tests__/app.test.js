const request = require('supertest');
const Database = require('better-sqlite3');
const createApp = require('../src/app');

// Create a fresh database instance for testing
let db;
let app;

beforeAll(() => {
  db = new Database(':memory:');
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Create app with test database
  const appInstance = createApp(db);
  app = appInstance.app;
});

afterAll(() => {
  // Close database connection after all tests
  if (db.open) {
    db.close();
  }
});

describe('GET /api/items', () => {
  beforeEach(() => {
    // Clear the items table before each test
    db.prepare('DELETE FROM items').run();
  });

  it('should return all items sorted by created_at DESC', async () => {
    // Insert test items with different dates
    const items = [
      { name: 'Item 1', days: 3 },
      { name: 'Item 2', days: 2 },
      { name: 'Item 3', days: 1 }
    ];

    items.forEach(item => {
      const date = new Date(Date.now() - item.days * 24 * 60 * 60 * 1000);
      db.prepare('INSERT INTO items (name, created_at) VALUES (?, ?)')
        .run(item.name, date.toISOString());
    });

    const response = await request(app)
      .get('/api/items')
      .expect(200);

    expect(response.body).toHaveLength(3);
    // Verify items are sorted by created_at DESC
    expect(response.body[0].name).toBe('Item 3');
    expect(response.body[1].name).toBe('Item 2');
    expect(response.body[2].name).toBe('Item 1');
  });

  it('should return empty array when no items exist', async () => {
    const response = await request(app)
      .get('/api/items')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    // Create a temporary database that we'll close to simulate an error
    const tempDb = new Database(':memory:');
    tempDb.close();

    // Mock the database operation to throw an error
    jest.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await request(app)
      .get('/api/items')
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to fetch items'
    });

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

describe('POST /api/items', () => {
  beforeEach(() => {
    // Clear the items table before each test
    db.prepare('DELETE FROM items').run();
  });

  it('should create a new item with valid data', async () => {
    const newItem = { name: 'Test Item' };

    const response = await request(app)
      .post('/api/items')
      .send(newItem)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: newItem.name,
      created_at: expect.any(String)
    });

    // Verify item was actually created in database
    const createdItem = db.prepare('SELECT * FROM items WHERE id = ?').get(response.body.id);
    expect(createdItem).toBeDefined();
    expect(createdItem.name).toBe(newItem.name);
  });

  it('should reject empty item names', async () => {
    const testCases = [
      { name: '' },
      { name: '   ' },
      { name: null },
      { name: undefined },
      {}
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/items')
        .send(testCase)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Item name is required'
      });
    }

    // Verify no items were created
    const items = db.prepare('SELECT * FROM items').all();
    expect(items).toHaveLength(0);
  });

  it('should reject non-string item names', async () => {
    const testCases = [
      { name: 123 },
      { name: true },
      { name: { key: 'value' } },
      { name: ['item'] }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/items')
        .send(testCase)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Item name is required'
      });
    }
  });

  it('should handle database errors gracefully', async () => {
    // Mock the database operation to throw an error
    jest.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await request(app)
      .post('/api/items')
      .send({ name: 'Test Item' })
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to create item'
    });

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});

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