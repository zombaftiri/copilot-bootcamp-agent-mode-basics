const request = require('supertest');
const app = require('../src/app');
const path = require('path');

// Mock the database
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })
  }));
});

describe('DELETE /api/items/:id', () => {
  let server;

  beforeAll(() => {
    server = app.listen();
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should delete an item successfully', async () => {
    const mockId = '123';
    const mockDeleteResult = { changes: 1 };

    // Mock the database operation
    const betterSqlite3 = require('better-sqlite3');
    const mockDb = betterSqlite3();
    mockDb.prepare.mockReturnValue({
      run: jest.fn().mockReturnValue(mockDeleteResult)
    });

    const response = await request(server)
      .delete(`/api/items/${mockId}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Item deleted successfully'
    });

    // Verify that the delete statement was prepared correctly
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM items WHERE id = ?');
    
    // Verify that run was called with the correct ID
    const deleteStmt = mockDb.prepare();
    expect(deleteStmt.run).toHaveBeenCalledWith(mockId);
  });

  it('should return 404 when item does not exist', async () => {
    const mockId = '999';
    const mockDeleteResult = { changes: 0 };

    // Mock the database operation
    const betterSqlite3 = require('better-sqlite3');
    const mockDb = betterSqlite3();
    mockDb.prepare.mockReturnValue({
      run: jest.fn().mockReturnValue(mockDeleteResult)
    });

    const response = await request(server)
      .delete(`/api/items/${mockId}`)
      .expect(404);

    expect(response.body).toEqual({
      error: 'Item not found'
    });
  });

  it('should return 500 when database operation fails', async () => {
    const mockId = '123';

    // Mock the database operation to throw an error
    const betterSqlite3 = require('better-sqlite3');
    const mockDb = betterSqlite3();
    mockDb.prepare.mockReturnValue({
      run: jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      })
    });

    const response = await request(server)
      .delete(`/api/items/${mockId}`)
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to delete item'
    });
  });
});
