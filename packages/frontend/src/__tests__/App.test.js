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

  describe('delete functionality', () => {
    it('should delete an item when delete button is clicked', async () => {
      // Mock the delete request
      global.fetch.mockImplementation((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockItems)
          });
        }
        if (url === '/api/items/1' && options.method === 'DELETE') {
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
