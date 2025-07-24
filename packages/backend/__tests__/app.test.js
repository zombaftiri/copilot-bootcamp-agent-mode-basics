const request = require('supertest');
const Database = require('better-sqlite3');
const createApp = require('../src/app');

// Create a fresh database instance for testing
let db;
let app;

// Mock console.error and console.log to suppress expected logs during testing
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  
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
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  
  // Close database connection after all tests
  if (db.open) {
    db.close();
  }
});

describe('createApp function', () => {
  it('should create app with default in-memory database when no testDb provided', () => {
    // Test the createApp function without providing testDb
    const { app: newApp, db: newDb, insertStmt } = createApp();
    
    expect(newApp).toBeDefined();
    expect(newDb).toBeDefined();
    expect(insertStmt).toBeDefined();
    
    // Verify the database has been initialized with sample data
    const items = newDb.prepare('SELECT * FROM items').all();
    expect(items.length).toBeGreaterThanOrEqual(3); // Should have initial items
    
    // Clean up
    newDb.close();
  });

  it('should create app with provided test database', () => {
    const testDb = new Database(':memory:');
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const { app: newApp, db: returnedDb, insertStmt } = createApp(testDb);
    
    expect(newApp).toBeDefined();
    expect(returnedDb).toBe(testDb);
    expect(insertStmt).toBeDefined();
    
    // Clean up
    testDb.close();
  });
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

  it('should delete any item (5-day restriction is currently disabled)', async () => {
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

  it('should delete items regardless of age (5-day restriction disabled)', async () => {
    // Insert item that's 1 day old
    const result = insertItemWithDate('Recent Item', 1);
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

  it('should handle database errors gracefully during deletion', async () => {
    // First insert an item
    const result = insertItemWithDate('Test Item', 1);
    const itemId = result.lastInsertRowid;

    // Mock the prepare method to throw an error on DELETE statement
    const originalPrepare = db.prepare;
    jest.spyOn(db, 'prepare').mockImplementation((sql) => {
      if (sql.includes('DELETE')) {
        throw new Error('Database deletion error');
      }
      return originalPrepare.call(db, sql);
    });

    const response = await request(app)
      .delete(`/api/items/${itemId}`)
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to delete item'
    });

    // Restore the original implementation
    jest.restoreAllMocks();
  });

  it('should handle database errors when checking if item exists', async () => {
    // Mock the prepare method to throw an error on SELECT statement
    jest.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('Database select error');
    });

    const response = await request(app)
      .delete('/api/items/1')
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to delete item'
    });

    // Restore the original implementation
    jest.restoreAllMocks();
  });

  it('should handle numeric string IDs correctly', async () => {
    // Insert item
    const result = insertItemWithDate('Numeric ID Item', 1);
    const itemId = result.lastInsertRowid;

    const response = await request(app)
      .delete(`/api/items/${itemId}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Item deleted successfully'
    });
  });

  it('should handle zero ID', async () => {
    const response = await request(app)
      .delete('/api/items/0')
      .expect(404);

    expect(response.body).toEqual({
      error: 'Item not found'
    });
  });

  it('should handle negative ID', async () => {
    const response = await request(app)
      .delete('/api/items/-1')
      .expect(404);

    expect(response.body).toEqual({
      error: 'Item not found'
    });
  });
});

describe('Middleware and app configuration', () => {
  it('should handle CORS', async () => {
    const response = await request(app)
      .options('/api/items')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  it('should parse JSON bodies', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({ name: 'JSON Test Item' })
      .expect(201);

    expect(response.body.name).toBe('JSON Test Item');
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/items')
      .set('Content-Type', 'application/json')
      .send('{"name": "incomplete JSON"')
      .expect(400);
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);
  });

  it('should handle different HTTP methods on items endpoint', async () => {
    // PUT should return 404 since it's not implemented
    const putResponse = await request(app)
      .put('/api/items/1')
      .expect(404);

    // PATCH should return 404 since it's not implemented
    const patchResponse = await request(app)
      .patch('/api/items/1')
      .expect(404);
  });
});

describe('Database initialization and item insertion', () => {
  it('should handle insertStmt being reused', async () => {
    // Clear existing items
    db.prepare('DELETE FROM items').run();

    // Create multiple items to test insertStmt reuse
    const items = ['Item A', 'Item B', 'Item C'];
    
    for (const itemName of items) {
      const response = await request(app)
        .post('/api/items')
        .send({ name: itemName })
        .expect(201);
      
      expect(response.body.name).toBe(itemName);
    }

    // Verify all items were created
    const allItems = await request(app)
      .get('/api/items')
      .expect(200);

    expect(allItems.body).toHaveLength(3);
  });

  it('should handle concurrent requests properly', async () => {
    // Clear existing items
    db.prepare('DELETE FROM items').run();

    // Create concurrent POST requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/items')
          .send({ name: `Concurrent Item ${i}` })
      );
    }

    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(`Concurrent Item ${index}`);
    });

    // Verify all items were created
    const allItems = await request(app)
      .get('/api/items')
      .expect(200);

    expect(allItems.body).toHaveLength(5);
  });
});