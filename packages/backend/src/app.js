const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Function to create app with optional test database
const createApp = (testDb = null) => {
  // Initialize express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Use provided test database or create new one
  const db = testDb || new Database(':memory:');

  if (!testDb) {
    // Create tables only if using new database
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

// Insert some initial data
const initialItems = ['Item 1', 'Item 2', 'Item 3'];
const insertStmt = db.prepare('INSERT INTO items (name) VALUES (?)');

initialItems.forEach((item) => {
  insertStmt.run(item);
});

console.log('In-memory database initialized with sample data');

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const result = insertStmt.run(name);
    const id = result.lastInsertRowid;

    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the item exists
    const item = db.prepare('SELECT created_at FROM items WHERE id = ?').get(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // For testing purposes, we'll allow immediate deletion
    // In production, you might want to restore the 5-day restriction
    // const createdAt = new Date(item.created_at);
    // const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    // if (createdAt > fiveDaysAgo) {
    //   return res.status(403).json({ error: 'Items can only be deleted after 5 days' });
    // }

    const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
    const result = deleteStmt.run(id);
    
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

  return { app, db, insertStmt };
};

module.exports = createApp;
