import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import request from 'supertest';
import app from '../app';

// Mock fetch globally
global.fetch = jest.fn();

describe('App', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Mock the initial data fetch
    global.fetch.mockImplementation((url) => {
      if (url === '/api/items') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockItems)
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('initial load', () => {
    it('should show loading state while fetching data', () => {
      // Mock fetch to delay response
      global.fetch.mockImplementation(() => new Promise(() => {}));
      
      render(<App />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show error message when fetch fails', async () => {
      global.fetch.mockImplementation(() => 
        Promise.reject(new Error('Network error'))
      );

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
      });
    });

    it('should display data when fetch succeeds', async () => {
      render(<App />);

      await waitFor(() => {
        mockItems.forEach(item => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });
      });
    });
  });

  describe('add item functionality', () => {
    it('should add a new item when form is submitted', async () => {
      const newItem = { id: 3, name: 'New Item' };
      
      global.fetch.mockImplementation((url, options) => {
        if (url === '/api/items' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(newItem)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockItems)
        });
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Fill and submit the form
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Item' } });
      fireEvent.submit(screen.getByRole('form'));

      // Verify new item is added
      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });

      // Verify form is cleared
      expect(input.value).toBe('');
    });

    it('should show error when adding item fails', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url === '/api/items' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          });
        }
        // File: packages/backend/src/__tests__/api.test.js


        describe('Items API', () => {
            let testItems = [];

            beforeEach(() => {
                // Reset test data before each test
                testItems = [
                    { id: 1, name: 'Test Item 1' },
                    { id: 2, name: 'Test Item 2' }
                ];
            });

            describe('GET /api/items', () => {
                it('should return all items', async () => {
                    const response = await request(app)
                        .get('/api/items')
                        .expect(200);

                    expect(response.body).toBeInstanceOf(Array);
                    expect(response.body).toHaveLength(testItems.length);
                    expect(response.body[0]).toHaveProperty('id');
                    expect(response.body[0]).toHaveProperty('name'); 
                });

                it('should handle errors when retrieving items fails', async () => {
                    // Mock DB error
                    const mockError = new Error('Database error');
                    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

                    const response = await request(app)
                        .get('/api/items')
                        .expect(500);

                    expect(response.body).toHaveProperty('error');
                });
            });

            describe('POST /api/items', () => {
                it('should create new item with valid data', async () => {
                    const newItem = { name: 'New Test Item' };

                    const response = await request(app)
                        .post('/api/items')
                        .send(newItem)
                        .expect(201);

                    expect(response.body).toHaveProperty('id');
                    expect(response.body.name).toBe(newItem.name);
                });

                it('should reject invalid item data', async () => {
                    const invalidItem = { invalidField: 'test' };

                    const response = await request(app)
                        .post('/api/items')
                        .send(invalidItem)
                        .expect(400);

                    expect(response.body).toHaveProperty('error');
                });

                it('should handle empty item name', async () => {
                    const emptyItem = { name: '' };

                    const response = await request(app)
                        .post('/api/items')
                        .send(emptyItem)
                        .expect(400);

                    expect(response.body).toHaveProperty('error');
                });
            });

            describe('DELETE /api/items/:id', () => {
                it('should delete existing item', async () => {
                    await request(app)
                        .delete('/api/items/1')
                        .expect(200);

                    // Verify item was deleted
                    const response = await request(app)
                        .get('/api/items');
                        
                    expect(response.body.find(item => item.id === 1)).toBeUndefined();
                });

                it('should return 404 for non-existent item', async () => {
                    await request(app)
                        .delete('/api/items/999')
                        .expect(404);
                });

                it('should handle invalid id parameter', async () => {
                    await request(app)
                        .delete('/api/items/invalid')
                        .expect(400);
                });

                it('should handle database errors during deletion', async () => {
                    // Mock DB error
                    const mockError = new Error('Database error');
                    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

                    await request(app)
                        .delete('/api/items/1')
                        .expect(500);
                });
            });

            describe('API error handling', () => {
                it('should handle unexpected server errors', async () => {
                    // Mock unhandled error
                    const mockError = new Error('Unexpected error');
                    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

                    const response = await request(app)
                        .get('/api/items')
                        .expect(500);

                    expect(response.body).toHaveProperty('error');
                });

                it('should handle malformed JSON requests', async () => {
                    await request(app)
                        .post('/api/items')
                        .send('invalid json{')
                        .set('Content-Type', 'application/json')
                        .expect(400);
                });

                it('should return 404 for undefined routes', async () => {
                    await request(app)
                        .get('/api/undefined-route')
                        .expect(404);
                });
            });
        });
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Find and click delete button for Item 1
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify item was removed from the list
      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });

      // Verify delete request was made correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE'
      });
    });

    it('should show error message when delete request fails', async () => {
      // Mock the delete request to fail
      global.fetch.mockImplementation((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockItems)
          });
        }
        if (url === '/api/items/1' && options.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for items to load initially
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Store a reference to the initial table content
      const initialTable = screen.getByRole('table');
      expect(initialTable).toBeInTheDocument();

      // Find and click delete button for Item 1
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify error message is shown
      await waitFor(() => {
        // Verify error message appears
        expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        // Verify table is no longer visible when error is shown
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('should show error message when delete request throws', async () => {
      // Set up fetch mock for both initial load and delete
      let shouldThrow = false;
      global.fetch.mockImplementation((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockItems)
          });
        }
        if (url === '/api/items/1' && options?.method === 'DELETE') {
          shouldThrow = true;
          throw new Error('Network error');
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for the initial data to load
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Find and click delete button for Item 1
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify the error message appears and table is hidden
      await waitFor(() => {
        // Check error message appears
        expect(screen.getByText(/Error deleting item: Network error/)).toBeInTheDocument();
        // Verify table is not visible when error is shown
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });
  });
});
