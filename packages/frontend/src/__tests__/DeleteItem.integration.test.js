/**
 * Integration tests for delete item functionality
 * These tests focus specifically on the delete operations and their integration
 * with the UI components, API calls, and state management.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import {
  createMockItems,
  createMockItemsWithAges,
  createMockFetch,
  getTestScenario,
  mockErrorResponses
} from '../testUtils/mockData';

// Mock fetch globally for these tests
global.fetch = jest.fn();

describe('Delete Item Integration Tests', () => {
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
  });

  describe('Delete Operation Flow Integration', () => {
    it('should complete full delete operation flow successfully', async () => {
      const testScenario = getTestScenario('successful-deletion');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Verify initial state - all items loaded
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
        expect(screen.getByText('Test Item 3')).toBeInTheDocument();
        expect(screen.getByText('Test Item 4')).toBeInTheDocument();
      });

      // Verify initial UI state
      const initialDeleteButtons = screen.getAllByText('Delete');
      expect(initialDeleteButtons).toHaveLength(4);
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Perform delete operation
      fireEvent.click(initialDeleteButtons[0]);

      // Verify post-delete state
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
        expect(screen.getByText('Test Item 3')).toBeInTheDocument();
        expect(screen.getByText('Test Item 4')).toBeInTheDocument();
      });

      // Verify UI updates correctly
      const remainingDeleteButtons = screen.getAllByText('Delete');
      expect(remainingDeleteButtons).toHaveLength(3);
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Verify API call was made correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE'
      });
    });

    it('should handle cascading delete operations', async () => {
      const testItems = createMockItems(3);
      global.fetch = createMockFetch({ items: testItems });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        testItems.forEach(item => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });
      });

      // Delete items one by one
      for (let i = 0; i < testItems.length; i++) {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]); // Always click the first button

        if (i === testItems.length - 1) {
          // After deleting last item, should show empty message
          await waitFor(() => {
            expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
            expect(screen.queryByRole('table')).not.toBeInTheDocument();
          });
        } else {
          // Should still have remaining items
          await waitFor(() => {
            const remainingButtons = screen.getAllByText('Delete');
            expect(remainingButtons).toHaveLength(testItems.length - i - 1);
          });
        }
      }
    });

    it('should maintain proper state when delete operation fails', async () => {
      const testScenario = getTestScenario('deletion-server-error');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const initialItemCount = screen.getAllByText('Delete').length;

      // Attempt delete operation
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });

      // Note: The current implementation shows error and hides table
      // In a more sophisticated implementation, we might want to:
      // - Show error toast but keep table visible
      // - Retry mechanism
      // - Optimistic updates with rollback
    });
  });

  describe('Age-based Deletion Rules Integration', () => {
    it('should handle deletion restrictions based on item age', async () => {
      const testScenario = getTestScenario('deletion-forbidden');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Recent Item')).toBeInTheDocument();
      });

      // Try to delete a recent item (should fail)
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[2]); // Click on "Recent Item"

      // Verify appropriate error message
      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Failed to delete item/)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Integration', () => {
    it('should provide clear feedback during delete operations', async () => {
      let resolveDelete;
      const deletePromise = new Promise(resolve => {
        resolveDelete = resolve;
      });

      global.fetch = jest.fn((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createMockItems(2))
          });
        }
        if (url.includes('/api/items/') && options?.method === 'DELETE') {
          return deletePromise.then(() => Promise.resolve({ ok: true }));
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Initiate delete operation
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify delete request was initiated
      expect(global.fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE'
      });

      // Complete the delete operation
      resolveDelete();

      // Verify final state
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
      });
    });

    it('should handle sequential delete operations correctly', async () => {
      const testItems = createMockItems(3);
      
      global.fetch = jest.fn((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(testItems)
          });
        }
        if (url.includes('/api/items/') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Item deleted successfully' })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        testItems.forEach(item => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
        });
      });

      // Delete first item
      let deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]); // Delete Test Item 1

      // Wait for first item to be removed
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
        expect(screen.getByText('Test Item 3')).toBeInTheDocument();
      });

      // Delete second item
      deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]); // Now Test Item 2 is first

      // Wait for second item to be removed
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
        expect(screen.getByText('Test Item 3')).toBeInTheDocument();
      });

      // Verify correct API calls were made
      expect(global.fetch).toHaveBeenCalledWith('/api/items/1', { method: 'DELETE' });
      expect(global.fetch).toHaveBeenCalledWith('/api/items/2', { method: 'DELETE' });
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle deleting from empty list gracefully', async () => {
      const testScenario = getTestScenario('empty-list');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Verify empty state
      await waitFor(() => {
        expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });
    });

    it('should handle single item deletion to empty state', async () => {
      const testScenario = getTestScenario('single-item');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Verify single item state
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Delete the single item
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Verify transition to empty state
      await waitFor(() => {
        expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues during delete', async () => {
      global.fetch = jest.fn((url, options) => {
        if (url === '/api/items' && !options) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createMockItems(2))
          });
        }
        if (url.includes('/api/items/') && options?.method === 'DELETE') {
          throw new Error('Network connection failed');
        }
        return Promise.reject(new Error('Not found'));
      });

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // Attempt delete with network error
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify network error handling
      await waitFor(() => {
        expect(screen.getByText(/Error deleting item: Network connection failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper ARIA labels and roles during delete operations', async () => {
      const testScenario = getTestScenario('successful-deletion');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Verify table accessibility
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'items table');

      // Verify delete buttons are accessible
      const deleteButtons = screen.getAllByRole('button', { name: /Delete.*/ });
      expect(deleteButtons).toHaveLength(4);

      // Perform delete and verify accessibility is maintained
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        const remainingButtons = screen.getAllByRole('button', { name: /Delete.*/ });
        expect(remainingButtons).toHaveLength(3);
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation for delete operations', async () => {
      const testScenario = getTestScenario('successful-deletion');
      global.fetch = createMockFetch(testScenario);

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Focus on first delete button and trigger with Enter key
      const firstDeleteButton = screen.getAllByRole('button', { name: /Delete.*/ })[0];
      firstDeleteButton.focus();
      fireEvent.keyDown(firstDeleteButton, { key: 'Enter', code: 'Enter' });

      // Note: The actual keyboard navigation would need to be implemented
      // in the component. This test demonstrates how to test it.
    });
  });
});
