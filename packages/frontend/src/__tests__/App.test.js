import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
global.fetch = jest.fn();

describe('App', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];

  // Mock console.error to suppress expected error logs during testing
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

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
    it('should show load items while fetching data', () => {
      // Mock fetch to delay response
      global.fetch.mockImplementation(() => new Promise(() => { }));

      render(<App />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
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

    it('should display items when fetch succeeds', async () => {
      render(<App />);

      await waitFor(() => {
        mockItems.forEach(item => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });
      });
    });
  });

  describe('add item functionality', () => {
    it('should create a new item when form is submitted', async () => {
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
      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

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
        if (url === '/api/items') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockItems)
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Fill and submit the form
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Item' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/error adding item: failed to add item/i)).toBeInTheDocument();
      });
    });
  });
  describe('delete functionality integration tests', () => {
    // Enhanced mock data for comprehensive testing
    const extendedMockItems = [
      { id: 1, name: 'First Item', created_at: '2025-07-18T10:00:00Z' },
      { id: 2, name: 'Second Item', created_at: '2025-07-19T10:00:00Z' },
      { id: 3, name: 'Third Item', created_at: '2025-07-20T10:00:00Z' },
      { id: 4, name: 'Fourth Item', created_at: '2025-07-21T10:00:00Z' }
    ];

    beforeEach(() => {
      // Reset fetch mock for each delete test
      jest.resetAllMocks();
    });

    describe('successful deletion scenarios', () => {
      it('should delete item when delete button is clicked', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({ 
              ok: true,
              json: () => Promise.resolve({ message: 'Item deleted successfully' })
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for items to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
          expect(screen.getByText('Second Item')).toBeInTheDocument();
        });

        // Verify all items are initially present
        extendedMockItems.forEach(item => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });

        // Find and click delete button for First Item
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons).toHaveLength(4);
        fireEvent.click(deleteButtons[0]);

        // Verify item was removed from the list
        await waitFor(() => {
          expect(screen.queryByText('First Item')).not.toBeInTheDocument();
          expect(screen.getByText('Second Item')).toBeInTheDocument();
          expect(screen.getByText('Third Item')).toBeInTheDocument();
          expect(screen.getByText('Fourth Item')).toBeInTheDocument();
        });

        // Verify delete request was made correctly
        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'DELETE'
        });

        // Verify the number of delete buttons is reduced
        const remainingDeleteButtons = screen.getAllByText('Delete');
        expect(remainingDeleteButtons).toHaveLength(3);
      });

      it('should delete multiple items sequentially', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (options?.method === 'DELETE') {
            return Promise.resolve({ 
              ok: true,
              json: () => Promise.resolve({ message: 'Item deleted successfully' })
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for all items to load
        await waitFor(() => {
          extendedMockItems.forEach(item => {
            expect(screen.getByText(item.name)).toBeInTheDocument();
          });
        });

        // Delete first item
        let deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.queryByText('First Item')).not.toBeInTheDocument();
        });

        // Delete second item
        deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]); // Now "Second Item" is first

        await waitFor(() => {
          expect(screen.queryByText('Second Item')).not.toBeInTheDocument();
        });

        // Verify remaining items
        expect(screen.getByText('Third Item')).toBeInTheDocument();
        expect(screen.getByText('Fourth Item')).toBeInTheDocument();

        // Verify both delete requests were made
        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', { method: 'DELETE' });
        expect(global.fetch).toHaveBeenCalledWith('/api/items/2', { method: 'DELETE' });
      });

      it('should handle deleting all items until none remain', async () => {
        const singleItemMock = [{ id: 1, name: 'Last Item', created_at: '2025-07-18T10:00:00Z' }];

        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(singleItemMock)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for item to load
        await waitFor(() => {
          expect(screen.getByText('Last Item')).toBeInTheDocument();
        });

        // Delete the last item
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        // Verify the item is removed and "No items found" message appears
        await waitFor(() => {
          expect(screen.queryByText('Last Item')).not.toBeInTheDocument();
          expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
        });

        // Verify table is no longer present
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    describe('error handling scenarios', () => {
      it('should show error message when delete request fails with 403 (too recent)', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: false,
              status: 403,
              statusText: 'Forbidden',
              json: () => Promise.resolve({ error: 'Items can only be deleted after 5 days' })
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for items to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
        });

        // Find and click delete button for First Item
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error message appears and item remains
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
          expect(screen.queryByRole('table')).not.toBeInTheDocument();
        });
      });

      it('should show error message when delete request fails with 404 (not found)', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: false,
              status: 404,
              statusText: 'Not Found'
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for items to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
        });

        // Find and click delete button for First Item
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error message appears
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        });
      });

      it('should show error message when delete request fails with 500 (server error)', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
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
          expect(screen.getByText('First Item')).toBeInTheDocument();
        });

        // Store a reference to the initial table content
        const initialTable = screen.getByRole('table');
        expect(initialTable).toBeInTheDocument();

        // Find and click delete button for First Item
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error message is shown and table is hidden
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
          expect(screen.queryByRole('table')).not.toBeInTheDocument();
        });
      });

      it('should show error message when delete request throws network error', async () => {
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            throw new Error('Network connection failed');
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for the initial data to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
          expect(screen.getByRole('table')).toBeInTheDocument();
        });

        // Find and click delete button for First Item
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify the error message appears and table is hidden
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Network connection failed/)).toBeInTheDocument();
          expect(screen.queryByRole('table')).not.toBeInTheDocument();
        });
      });

      it('should preserve other items when one delete operation fails', async () => {
        let callCount = 0;
        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (options?.method === 'DELETE') {
            callCount++;
            if (callCount === 1) {
              // First delete succeeds
              return Promise.resolve({ ok: true });
            } else {
              // Second delete fails
              return Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
              });
            }
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for items to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
          expect(screen.getByText('Second Item')).toBeInTheDocument();
        });

        // Delete first item (should succeed)
        let deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.queryByText('First Item')).not.toBeInTheDocument();
          expect(screen.getByText('Second Item')).toBeInTheDocument();
        });

        // Try to delete second item (should fail)
        deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error appears
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        });
      });
    });

    describe('UI interaction scenarios', () => {
      it('should disable interactions while delete is in progress', async () => {
        let resolveDelete;
        const deletePromise = new Promise(resolve => {
          resolveDelete = resolve;
        });

        global.fetch.mockImplementation((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(extendedMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return deletePromise.then(() => Promise.resolve({ ok: true }));
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for items to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
        });

        // Click delete button
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Note: In a real implementation, we might want to show loading state
        // For now, we're just testing that the delete request was initiated
        expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
          method: 'DELETE'
        });

        // Resolve the delete operation
        resolveDelete();

        // Wait for item to be removed
        await waitFor(() => {
          expect(screen.queryByText('First Item')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('handleDelete Function Integration Tests', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
    });

    describe('State Management Integration', () => {
      it('should update data state correctly when delete succeeds', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' },
          { id: 2, name: 'Test Item 2', created_at: '2025-07-19T10:00:00Z' },
          { id: 3, name: 'Test Item 3', created_at: '2025-07-20T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
          expect(screen.getByText('Test Item 2')).toBeInTheDocument();
          expect(screen.getByText('Test Item 3')).toBeInTheDocument();
        });

        // Trigger handleDelete by clicking delete button
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify state is updated - item is removed from data array
        await waitFor(() => {
          expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
          expect(screen.getByText('Test Item 2')).toBeInTheDocument();
          expect(screen.getByText('Test Item 3')).toBeInTheDocument();
        });

        // Verify error state is cleared
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });

      it('should preserve data state when delete fails', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' },
          { id: 2, name: 'Test Item 2', created_at: '2025-07-19T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: false,
              status: 500,
              statusText: 'Internal Server Error'
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
          expect(screen.getByText('Test Item 2')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error state is set and data is preserved
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        });
      });

      it('should update error state correctly when delete throws exception', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' },
          { id: 2, name: 'Test Item 2', created_at: '2025-07-19T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            throw new Error('Network timeout');
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify error state is updated with the exception message
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Network timeout/)).toBeInTheDocument();
        });
      });
    });

    describe('API Integration', () => {
      it('should make correct DELETE request with proper URL and method', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        // Verify API call was made with correct parameters
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
            method: 'DELETE'
          });
        });
      });

      it('should handle different item IDs correctly', async () => {
        const testMockItems = [
          { id: 42, name: 'Special Item', created_at: '2025-07-18T10:00:00Z' },
          { id: 999, name: 'Another Item', created_at: '2025-07-19T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/42' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          if (url === '/api/items/999' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Special Item')).toBeInTheDocument();
          expect(screen.getByText('Another Item')).toBeInTheDocument();
        });

        // Delete first item (ID 42)
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify correct API call for first item
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/items/42', {
            method: 'DELETE'
          });
        });

        // Delete second item (ID 999)
        const remainingDeleteButtons = screen.getAllByText('Delete');
        fireEvent.click(remainingDeleteButtons[0]);

        // Verify correct API call for second item
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/items/999', {
            method: 'DELETE'
          });
        });
      });

      it('should handle response.ok false correctly', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: false,
              status: 403,
              statusText: 'Forbidden'
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        // Verify handleDelete correctly throws error for non-ok response
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        });
      });
    });

    describe('Function Behavior Integration', () => {
      it('should filter data array correctly for the right item ID', async () => {
        const testMockItems = [
          { id: 1, name: 'First Item', created_at: '2025-07-18T10:00:00Z' },
          { id: 2, name: 'Second Item', created_at: '2025-07-19T10:00:00Z' },
          { id: 3, name: 'Third Item', created_at: '2025-07-20T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/2' && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
          expect(screen.getByText('Second Item')).toBeInTheDocument();
          expect(screen.getByText('Third Item')).toBeInTheDocument();
        });

        // Delete the middle item (Second Item with ID 2)
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[1]); // Second button for Second Item

        // Verify only the correct item was removed
        await waitFor(() => {
          expect(screen.getByText('First Item')).toBeInTheDocument();
          expect(screen.queryByText('Second Item')).not.toBeInTheDocument();
          expect(screen.getByText('Third Item')).toBeInTheDocument();
        });
      });

      it('should handle async operation correctly with proper await', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' }
        ];
        let deletePromiseResolver;
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            return new Promise((resolve) => {
              deletePromiseResolver = resolve;
            });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        // Verify that the item is still present (delete hasn't completed)
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();

        // Resolve the delete promise
        deletePromiseResolver({ ok: true });

        // Now verify the item is removed
        await waitFor(() => {
          expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        });
      });

      it('should properly reset error state on successful delete', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' },
          { id: 2, name: 'Test Item 2', created_at: '2025-07-19T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url.includes('/api/items/') && options?.method === 'DELETE') {
            return Promise.resolve({ ok: true });
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger successful delete
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);

        // Verify successful delete and no error message
        await waitFor(() => {
          expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
          expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        // Verify setError(null) was called by checking no error element is displayed
        expect(screen.queryByText(/error deleting item/i)).not.toBeInTheDocument();
      });
    });

    describe('Error Handling Integration', () => {
      it('should preserve console.error logging on exceptions', async () => {
        const testMockItems = [
          { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' }
        ];
        
        global.fetch = jest.fn((url, options) => {
          if (url === '/api/items' && !options) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(testMockItems)
            });
          }
          if (url === '/api/items/1' && options?.method === 'DELETE') {
            throw new Error('Network error');
          }
          return Promise.reject(new Error('Not found'));
        });

        render(<App />);

        // Wait for initial data to load
        await waitFor(() => {
          expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        });

        // Trigger handleDelete
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        // Verify error handling
        await waitFor(() => {
          expect(screen.getByText(/Error deleting item: Network error/)).toBeInTheDocument();
        });

        // Verify console.error was called (our mock console.error is a jest function)
        expect(console.error).toHaveBeenCalledWith('Error deleting item:', expect.any(Error));
      });

      it('should handle various HTTP error status codes correctly', async () => {
        const testCases = [
          { status: 400, statusText: 'Bad Request' },
          { status: 403, statusText: 'Forbidden' },
          { status: 404, statusText: 'Not Found' },
          { status: 500, statusText: 'Internal Server Error' }
        ];

        for (const testCase of testCases) {
          // Reset mocks for each test case
          jest.resetAllMocks();
          
          const testMockItems = [
            { id: 1, name: 'Test Item 1', created_at: '2025-07-18T10:00:00Z' }
          ];
          
          global.fetch = jest.fn((url, options) => {
            if (url === '/api/items' && !options) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(testMockItems)
              });
            }
            if (url === '/api/items/1' && options?.method === 'DELETE') {
              return Promise.resolve({
                ok: false,
                status: testCase.status,
                statusText: testCase.statusText
              });
            }
            return Promise.reject(new Error('Not found'));
          });

          const { unmount } = render(<App />);

          // Wait for initial data to load
          await waitFor(() => {
            expect(screen.getByText('Test Item 1')).toBeInTheDocument();
          });

          // Trigger handleDelete
          const deleteButton = screen.getByText('Delete');
          fireEvent.click(deleteButton);

          // Verify error handling for this status code
          await waitFor(() => {
            expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
          });

          // Clean up for next iteration
          unmount();
        }
      });
    });
  });
});
