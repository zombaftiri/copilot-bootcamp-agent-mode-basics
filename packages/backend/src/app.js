const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const ItemDetailsController = require('./controllers/ItemDetailsController');

// Logging utility for debugging
const log = {
  debug: (message, data = null) => {
    console.debug(`[App] ${message}`, data ? { data } : '');
  },
  error: (message, error = null) => {
    console.error(`[App ERROR] ${message}`, error ? { error } : '');
  },
  warn: (message, data = null) => {
    console.warn(`[App WARNING] ${message}`, data ? { data } : '');
  },
  info: (message, data = null) => {
    console.info(`[App] ${message}`, data ? { data } : '');
  }
};

// Initialize express app
log.info('Initializing Express application');
const app = express();

// Middleware
log.info('Setting up middleware');
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
log.info('Initializing in-memory SQLite database');
const db = new Database(':memory:');

// Create tables
log.info('Creating database tables');
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS item_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    tags TEXT, -- JSON string
    status TEXT DEFAULT 'active',
    due_date TEXT,
    assignee TEXT,
    created_by TEXT,
    custom_fields TEXT, -- JSON string
    attachment_ids TEXT, -- JSON string
    metadata TEXT, -- JSON string
    dependencies TEXT, -- JSON string
    estimated_hours REAL,
    budget REAL,
    location TEXT,
    external_refs TEXT, -- JSON string
    workflow_stage TEXT,
    approval_required BOOLEAN DEFAULT 0,
    template_id INTEGER,
    parent_item_id INTEGER,
    linked_items TEXT, -- JSON string
    reminder_settings TEXT, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
log.info('Inserting initial sample data');
const initialItems = ['Item 1', 'Item 2', 'Item 3'];
const insertStmt = db.prepare('INSERT INTO items (name) VALUES (?)');

initialItems.forEach(item => {
  insertStmt.run(item);
  log.debug('Inserted sample item', { item });
});

log.info('In-memory database initialized with sample data');

// Initialize ItemDetailsController
log.info('Initializing ItemDetailsController');
const itemDetailsController = new ItemDetailsController(db);

// Insert some sample detailed items with problematic function calls that will cause runtime errors
log.info('Creating sample detailed items for refactoring exercises');
try {
  // This will cause errors due to the long parameter list and missing functions in the controller
  db.prepare(`
    INSERT INTO item_details (
      name, description, category, priority, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Detail Item 1',
    'This is a sample item with detailed information that will be used for refactoring exercises',
    'work',
    'high',
    'active',
    'system',
    new Date().toISOString()
  );

  db.prepare(`
    INSERT INTO item_details (
      name, description, category, priority, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Detail Item 2',
    'Another sample item for testing the details functionality',
    'personal',
    'medium',
    'pending',
    'system',
    new Date().toISOString()
  );

  log.info('Sample detailed items created for refactoring exercises');
} catch (error) {
  log.error('Error creating sample detailed items', error);
}

// API Routes
log.info('Setting up API routes');

app.get('/api/items', (req, res) => {
  log.debug('GET /api/items - Fetching all items');
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    log.info('Items fetched successfully', { count: items.length });
    res.json(items);
  } catch (error) {
    log.error('Error fetching items', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  log.debug('POST /api/items - Creating new item');
  try {
    const { name } = req.body;
    log.debug('Request data', { name });
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      log.warn('Item creation failed: invalid name', { name });
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    const result = insertStmt.run(name);
    const id = result.lastInsertRowid;
    log.debug('Item inserted', { id });
    
    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    log.info('Item created successfully', { itemId: id, name });
    res.status(201).json(newItem);
  } catch (error) {
    log.error('Error creating item', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  log.debug('DELETE /api/items/:id - Deleting item');
  try {
    const { id } = req.params;
    log.debug('Request parameters', { id });
    
    if (!id || isNaN(parseInt(id))) {
      log.warn('Item deletion failed: invalid ID', { id });
      return res.status(400).json({ error: 'Valid item ID is required' });
    }
    
    const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
    const result = deleteStmt.run(parseInt(id));
    log.debug('Deletion result', { changes: result.changes });
    
    if (result.changes === 0) {
      log.warn('Item not found for deletion', { id });
      return res.status(404).json({ error: 'Item not found' });
    }
    
    log.info('Item deleted successfully', { id });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    log.error('Error deleting item', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Item Details API Routes - these will have runtime errors for the refactoring exercise
log.info('Setting up Item Details API routes');

app.get('/api/items/:id/details', async (req, res) => {
  log.debug('GET /api/items/:id/details - Fetching item details');
  try {
    await itemDetailsController.getItemWithRelatedData(req, res);
  } catch (error) {
    log.error('Error in item details route', { error: error.message, itemId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/items/details', async (req, res) => {
  log.debug('POST /api/items/details - Creating detailed item');
  try {
    const {
      name, description, category, priority, tags, status, dueDate,
      assignee, createdBy, customFields, attachments, permissions,
      validationLevel, notificationSettings, auditEnabled, backupEnabled,
      versionControl, metadata, dependencies, estimatedHours, budget,
      location, externalRefs, workflowStage, approvalRequired, templateId,
      parentItemId, linkedItems, reminderSettings
    } = req.body;

    log.debug('Creating detailed item with data', { name, category, priority, status });
    log.info('Calling refactored createDetailedItem with object parameter');

    // Now using the refactored function with object parameter
    await itemDetailsController.createDetailedItem({
      req,
      res,
      itemData: {
        name,
        description,
        category,
        priority,
        tags,
        status,
        dueDate,
        assignee,
        createdBy,
        customFields,
        attachments,
        metadata,
        dependencies,
        estimatedHours,
        budget,
        location,
        externalRefs,
        parentItemId,
        linkedItems
      },
      options: {
        permissions,
        validationLevel,
        notificationSettings,
        auditEnabled,
        backupEnabled,
        versionControl,
        workflowStage,
        approvalRequired,
        templateId,
        reminderSettings
      }
    });
  } catch (error) {
    log.error('Error creating detailed item', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ error: 'Failed to create detailed item' });
  }
});

app.put('/api/items/:id/details', async (req, res) => {
  log.debug('PUT /api/items/:id/details - Updating detailed item');
  try {
    const { id } = req.params;
    const updates = req.body;
    
    log.debug('Updating detailed item', { id, updates });
    log.info('Calling refactored updateItemWithAdvancedOptions with object parameter');
    
    // Now using the refactored function with object parameter
    const result = await itemDetailsController.updateItemWithAdvancedOptions({
      itemId: id,
      updates,
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'user',
      permissions: req.permissions,
      validationRules: req.validationRules,
      auditOptions: req.auditOptions,
      notificationOptions: req.notificationOptions,
      backupOptions: req.backupOptions,
      versioningOptions: req.versioningOptions,
      conflictResolution: req.conflictResolution,
      retryPolicy: req.retryPolicy,
      timeoutSettings: req.timeoutSettings,
      cachingStrategy: req.cachingStrategy,
      loggingLevel: req.loggingLevel,
      performanceTracking: req.performanceTracking,
      securityContext: req.securityContext,
      transactionOptions: req.transactionOptions,
      rollbackStrategy: req.rollbackStrategy,
      successCallbacks: req.successCallbacks,
      errorCallbacks: req.errorCallbacks,
      progressCallbacks: req.progressCallbacks,
      customValidators: req.customValidators,
      postProcessors: req.postProcessors,
      preProcessors: req.preProcessors
    });
    
    log.info('Detailed item updated successfully', { id });
    res.json(result);
  } catch (error) {
    log.error('Error updating detailed item', { 
      error: error.message, 
      itemId: id 
    });
    res.status(500).json({ error: 'Failed to update detailed item' });
  }
});

app.delete('/api/items/:id/details', async (req, res) => {
  log.debug('DELETE /api/items/:id/details - Deleting detailed item');
  try {
    await itemDetailsController.deleteItemWithCleanup(req, res);
  } catch (error) {
    log.error('Error deleting detailed item', { 
      error: error.message, 
      itemId: req.params.id 
    });
    res.status(500).json({ error: 'Failed to delete detailed item' });
  }
});

// Route to get all detailed items (for testing purposes)
app.get('/api/items/details', (req, res) => {
  log.debug('GET /api/items/details - Fetching all detailed items');
  try {
    const detailedItems = db.prepare('SELECT * FROM item_details ORDER BY created_at DESC').all();
    log.info('Detailed items fetched successfully', { count: detailedItems.length });
    res.json(detailedItems);
  } catch (error) {
    log.error('Error fetching detailed items', error);
    res.status(500).json({ error: 'Failed to fetch detailed items' });
  }
});

log.info('All API routes configured successfully');

module.exports = { app, db, insertStmt };