/**
 * Mock data factories for testing
 * This file contains helper functions to generate test data for various scenarios
 */

/**
 * Creates a basic mock item with minimal required fields
 * @param {Object} overrides - Properties to override in the default item
 * @returns {Object} Mock item object
 */
export const createMockItem = (overrides = {}) => ({
  id: 1,
  name: 'Test Item',
  created_at: '2025-07-18T10:00:00Z',
  ...overrides
});

/**
 * Creates multiple mock items for testing list scenarios
 * @param {number} count - Number of items to create
 * @param {Object} baseProps - Base properties for all items
 * @returns {Array} Array of mock item objects
 */
export const createMockItems = (count = 3, baseProps = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createMockItem({
      id: index + 1,
      name: `Test Item ${index + 1}`,
      created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      ...baseProps
    })
  );
};

/**
 * Creates mock items with specific ages for testing deletion rules
 * @returns {Array} Array of mock items with varying ages
 */
export const createMockItemsWithAges = () => [
  createMockItem({
    id: 1,
    name: 'Very Old Item',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days old
  }),
  createMockItem({
    id: 2,
    name: 'Old Item',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days old
  }),
  createMockItem({
    id: 3,
    name: 'Recent Item',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days old
  }),
  createMockItem({
    id: 4,
    name: 'New Item',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day old
  })
];

/**
 * Creates a mock fetch implementation for testing various scenarios
 * @param {Object} config - Configuration for the mock fetch behavior
 * @param {Array} config.items - Items to return for GET requests
 * @param {Object} config.deleteResponse - Response configuration for DELETE requests
 * @param {Object} config.postResponse - Response configuration for POST requests
 * @returns {Function} Mock fetch function
 */
export const createMockFetch = ({
  items = createMockItems(2),
  deleteResponse = { success: true },
  postResponse = { success: true }
} = {}) => {
  return jest.fn((url, options) => {
    // Handle GET requests
    if (url === '/api/items' && !options) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(items)
      });
    }

    // Handle DELETE requests
    if (url.includes('/api/items/') && options?.method === 'DELETE') {
      if (!deleteResponse.success) {
        return Promise.resolve({
          ok: false,
          status: deleteResponse.status || 500,
          statusText: deleteResponse.statusText || 'Internal Server Error',
          json: () => Promise.resolve({ error: deleteResponse.error || 'Failed to delete item' })
        });
      }
      
      if (deleteResponse.throwError) {
        throw new Error(deleteResponse.errorMessage || 'Network error');
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Item deleted successfully' })
      });
    }

    // Handle POST requests
    if (url === '/api/items' && options?.method === 'POST') {
      if (!postResponse.success) {
        return Promise.resolve({
          ok: false,
          status: postResponse.status || 500,
          statusText: postResponse.statusText || 'Internal Server Error'
        });
      }

      const newItem = createMockItem({
        id: Math.max(...items.map(item => item.id)) + 1,
        name: JSON.parse(options.body).name
      });

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(newItem)
      });
    }

    return Promise.reject(new Error('Not found'));
  });
};

/**
 * Mock responses for different error scenarios
 */
export const mockErrorResponses = {
  networkError: {
    success: false,
    throwError: true,
    errorMessage: 'Network connection failed'
  },
  serverError: {
    success: false,
    status: 500,
    statusText: 'Internal Server Error',
    error: 'Internal server error occurred'
  },
  forbiddenError: {
    success: false,
    status: 403,
    statusText: 'Forbidden',
    error: 'Items can only be deleted after 5 days'
  },
  notFoundError: {
    success: false,
    status: 404,
    statusText: 'Not Found',
    error: 'Item not found'
  }
};

/**
 * Helper function to setup common test scenarios
 * @param {string} scenario - The test scenario to setup
 * @returns {Object} Configuration object for the scenario
 */
export const getTestScenario = (scenario) => {
  const scenarios = {
    'successful-deletion': {
      items: createMockItems(4),
      deleteResponse: { success: true }
    },
    'deletion-forbidden': {
      items: createMockItemsWithAges(),
      deleteResponse: mockErrorResponses.forbiddenError
    },
    'deletion-not-found': {
      items: createMockItems(2),
      deleteResponse: mockErrorResponses.notFoundError
    },
    'deletion-server-error': {
      items: createMockItems(3),
      deleteResponse: mockErrorResponses.serverError
    },
    'deletion-network-error': {
      items: createMockItems(2),
      deleteResponse: mockErrorResponses.networkError
    },
    'empty-list': {
      items: [],
      deleteResponse: { success: true }
    },
    'single-item': {
      items: createMockItems(1),
      deleteResponse: { success: true }
    }
  };

  return scenarios[scenario] || scenarios['successful-deletion'];
};
