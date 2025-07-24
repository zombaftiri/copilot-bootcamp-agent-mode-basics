import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import theme from './theme/theme';
import ItemDetails from './components/ItemDetails';
import ItemService from './utils/ItemService';
import './App.css';

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

function App() {
  log.info('App component initializing');
  
  const [data, setData] = useState([]);
  const [detailedItems, setDetailedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemService] = useState(new ItemService());

  log.debug('Initial state set', { 
    dataLength: data.length, 
    loading, 
    error,
    itemDetailsOpen 
  });

  useEffect(() => {
    log.info('App useEffect triggered - fetching initial data');
    fetchData();
    fetchDetailedItems();
  }, []);

  const fetchData = async () => {
    log.debug('fetchData called');
    try {
      setLoading(true);
      log.info('Fetching items from API');
      const response = await fetch('/api/items');
      
      if (!response.ok) {
        log.error('Failed to fetch items', { status: response.status });
        throw new Error('Failed to fetch items');
      }
      
      const items = await response.json();
      log.info('Items fetched successfully', { count: items.length });
      setData(items);
      setError(null);
    } catch (err) {
      log.error('Error in fetchData', err);
      setError(err.message);
    } finally {
      setLoading(false);
      log.debug('fetchData completed');
    }
  };

  const fetchDetailedItems = async () => {
    log.debug('fetchDetailedItems called');
    try {
      log.info('Fetching detailed items from API');
      const response = await fetch('/api/items/details');
      
      if (!response.ok) {
        log.error('Failed to fetch detailed items', { status: response.status });
        throw new Error('Failed to fetch detailed items');
      }
      
      const items = await response.json();
      log.info('Detailed items fetched successfully', { count: items.length });
      setDetailedItems(items);
    } catch (err) {
      log.error('Error in fetchDetailedItems', err);
      // Don't set main error state for detailed items fetch failure
    }
  };

  const handleItemDetailsOpen = (
    item,
    mode,
    permissions,
    validationLevel,
    notificationSettings,
    auditEnabled,
    backupEnabled,
    showAdvanced,
    enableNotifications,
    autoSave,
    readOnly,
    allowEdit,
    allowDelete,
    showHistory,
    customFields,
    templateId
  ) => {
    log.warn('handleItemDetailsOpen called with excessive parameters - needs refactoring');
    log.debug('Opening item details', { item, mode, permissions });
    
    setSelectedItem(item);
    setItemDetailsOpen(true);
    
    try {
      // This function doesn't exist - will cause runtime error
      log.debug('Attempting to call updateUserPreferences');
      // updateUserPreferences(mode, permissions, validationLevel);
    } catch (error) {
      log.error('Runtime error: updateUserPreferences function is not defined', error);
    }
  };

  const handleItemDetailsSave = async (itemData) => {
    log.info('handleItemDetailsSave called');
    log.debug('Item data to save', itemData);
    log.warn('About to call createItemWithDetails with excessive parameters');
    
    try {
      const result = await itemService.createItemWithDetails(
        itemData.name,
        itemData.description,
        itemData.category,
        itemData.priority,
        itemData.tags,
        itemData.status,
        itemData.dueDate,
        itemData.assignee,
        'current_user',
        itemData.customFields,
        itemData.permissions,
        'standard',
        itemData.notificationSettings,
        true,
        true,
        true,
        itemData.metadata,
        itemData.attachments,
        itemData.dependencies,
        itemData.estimatedHours,
        itemData.actualHours,
        itemData.budget,
        'USD',
        itemData.location,
        itemData.externalReferences
      );
      
      log.info('Item saved successfully', { itemId: result.id });
      setDetailedItems([...detailedItems, result]);
      setItemDetailsOpen(false);
      setSelectedItem(null);
    } catch (error) {
      log.error('Error saving item details', error);
      setError('Failed to save item details');
    }
  };

  const handleSubmit = async (e) => {
    log.debug('handleSubmit called');
    e.preventDefault();
    if (!newItem.trim()) {
      log.warn('Submit attempted with empty item name');
      return;
    }

    log.info('Submitting new item', { name: newItem });
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItem }),
      });

      if (!response.ok) {
        log.error('API request failed', { status: response.status });
        throw new Error('Failed to add item');
      }

      const result = await response.json();
      log.info('Item added successfully', { itemId: result.id, name: result.name });
      setData([...data, result]);
      setNewItem('');
    } catch (err) {
      log.error('Error adding item', err);
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  const handleDelete = async (itemId) => {
    log.debug('handleDelete called', { itemId });
    try {
      log.info('Deleting item', { itemId });
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        log.error('Delete request failed', { status: response.status, itemId });
        throw new Error('Failed to delete item');
      }

      log.info('Item deleted successfully', { itemId });
      setData(data.filter(item => item.id !== itemId));
      setError(null);
    } catch (err) {
      log.error('Error deleting item', { error: err, itemId });
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  const deleteDetailedItem = async (itemId) => {
    log.debug('deleteDetailedItem called', { itemId });
    try {
      log.info('Deleting detailed item', { itemId });
      const response = await fetch(`/api/items/${itemId}/details`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      log.debug('Delete response received', result);
      
      try {
        // This function doesn't exist - will cause runtime error
        log.debug('Attempting to call removeFromDetailedItems');
        // removeFromDetailedItems(itemId);
      } catch (error) {
        log.error('Runtime error: removeFromDetailedItems function is not defined', error);
      }
      
      log.info('Detailed item deleted successfully', { itemId });
      setDetailedItems(detailedItems.filter(item => item.id !== itemId));
    } catch (error) {
      log.error('Error deleting detailed item', { error, itemId });
      console.error('Delete failed:', error);
    }
  };

  const updateDetailedItem = async (itemData) => {
    log.debug('updateDetailedItem called', { itemId: itemData.id });
    try {
      try {
        // This function doesn't exist - will cause runtime error
        log.debug('Attempting to validate item data');
        // if (!validateItemData(itemData)) {
        //   throw new Error('Invalid item data');
        // }
        log.warn('validateItemData function is not defined - skipping validation');
      } catch (error) {
        log.error('Runtime error: validateItemData function is not defined', error);
        // Continue without validation for now
      }
      
      log.info('Updating detailed item', { itemId: itemData.id });
      const response = await fetch(`/api/items/${itemData.id}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      const result = await response.json();
      log.debug('Update response received', result);
      
      try {
        // This function doesn't exist - will cause runtime error
        log.debug('Attempting to call updateItemInState');
        // updateItemInState(result);
      } catch (error) {
        log.error('Runtime error: updateItemInState function is not defined', error);
      }
      
      log.info('Detailed item updated successfully', { itemId: itemData.id });
    } catch (error) {
      log.error('Error updating detailed item', { error, itemId: itemData.id });
      setError('Update failed: ' + error.message);
    }
  };

  const processItemAction = (
    action,
    itemId,
    userId,
    userRole,
    permissions,
    validationLevel,
    auditEnabled,
    notificationSettings,
    backupEnabled,
    retryCount,
    timeout,
    cascadeDeletes,
    confirmationRequired,
    undoSupported,
    versionControl,
    securityContext,
    performanceTracking,
    errorRecovery,
    successCallback,
    errorCallback
  ) => {
    log.warn('processItemAction called with excessive parameters - needs refactoring');
    log.debug('Processing item action', { action, itemId, userId, userRole });
    
    try {
      switch (action) {
        case 'delete':
          log.debug('Attempting to execute delete action');
          try {
            // return executeDelete(
            //   itemId, userId, permissions, auditEnabled,
            //   cascadeDeletes, confirmationRequired, undoSupported
            // );
            log.warn('executeDelete function is not defined - returning null');
            return null;
          } catch (error) {
            log.error('Runtime error: executeDelete function is not defined', error);
            return null;
          }
        case 'update':
          log.debug('Attempting to execute update action');
          try {
            // return executeUpdate(
            //   itemId, userId, validationLevel, versionControl,
            //   notificationSettings, performanceTracking
            // );
            log.warn('executeUpdate function is not defined - returning null');
            return null;
          } catch (error) {
            log.error('Runtime error: executeUpdate function is not defined', error);
            return null;
          }
        case 'archive':
          log.debug('Attempting to execute archive action');
          try {
            // return executeArchive(itemId, userId, backupEnabled, auditEnabled);
            log.warn('executeArchive function is not defined - returning null');
            return null;
          } catch (error) {
            log.error('Runtime error: executeArchive function is not defined', error);
            return null;
          }
        default:
          log.warn('Unknown action type', { action });
          return null;
      }
    } catch (error) {
      log.error('Error in processItemAction', { error, action, itemId });
      return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h1" component="h1" color="white" sx={{ 
            backgroundColor: 'primary.main',
            p: 2,
            borderRadius: 1,
            mb: 0
          }}>
            Hello World
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Connected to in-memory database
          </Typography>
        </Paper>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h2" component="h2" gutterBottom>
              Add New Item
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Enter item name"
                size="medium"
              />
              <Button 
                type="submit" 
                variant="contained" 
                sx={{ minWidth: 120 }}
              >
                Add Item
              </Button>
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h2" component="h2" gutterBottom>
              Items from Database
            </Typography>
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Loading data...
                </Typography>
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {!loading && !error && (
              <>
                {data.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="items table">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.map((item) => (
                          <TableRow 
                            key={item.id} 
                            sx={{ 
                              '&:hover': { backgroundColor: 'grey.50' },
                              '&:last-child td, &:last-child th': { border: 0 }
                            }}
                          >
                            <TableCell component="th" scope="row">
                              {item.id}
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => handleDelete(item.id)}
                                color="error"
                                aria-label={`Delete ${item.name}`}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'error.light',
                                    color: 'white'
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    No items found. Add some!
                  </Typography>
                )}
              </>
            )}
          </Paper>
        </Box>

        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h2" component="h2">
              Item Details Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleItemDetailsOpen(
                null, // item
                'create', // mode
                ['read', 'write'], // permissions
                'standard', // validationLevel
                { email: true, sms: false }, // notificationSettings
                true, // auditEnabled
                true, // backupEnabled
                false, // showAdvanced
                true, // enableNotifications
                false, // autoSave
                false, // readOnly
                true, // allowEdit
                true, // allowDelete
                false, // showHistory
                {}, // customFields
                null // templateId
              )}
            >
              Add Details
            </Button>
          </Box>

          {detailedItems.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table sx={{ minWidth: 650 }} aria-label="detailed items table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailedItems.map((item) => (
                    <TableRow 
                      key={item.id}
                      sx={{ 
                        '&:hover': { backgroundColor: 'grey.50' },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {item.id}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => {
                            handleItemDetailsOpen(
                              item, 'edit', ['read', 'write'], 'standard',
                              { email: true }, true, true, true, true, false,
                              false, true, true, true, {}, null
                            );
                          }}
                          color="primary"
                          aria-label={`Edit ${item.name}`}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            deleteDetailedItem(item.id);
                          }}
                          color="error"
                          aria-label={`Delete ${item.name}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              No detailed items found. Create some!
            </Typography>
          )}
        </Paper>

        <ItemDetails
          open={itemDetailsOpen}
          onClose={() => setItemDetailsOpen(false)}
          itemId={selectedItem?.id}
          itemName={selectedItem?.name}
          itemDescription={selectedItem?.description}
          itemCategory={selectedItem?.category}
          itemPriority={selectedItem?.priority}
          itemTags={selectedItem?.tags ? JSON.parse(selectedItem.tags) : []}
          itemStatus={selectedItem?.status}
          itemDueDate={selectedItem?.due_date}
          itemAssignee={selectedItem?.assignee}
          itemCreatedBy={selectedItem?.created_by}
          itemCreatedAt={selectedItem?.created_at}
          itemUpdatedAt={selectedItem?.updated_at}
          showAdvanced={true}
          enableNotifications={true}
          autoSave={false}
          readOnly={false}
          onSave={handleItemDetailsSave}
          onDelete={(id) => {
            deleteDetailedItem(id);
          }}
          onUpdate={(data) => {
            updateDetailedItem(data);
          }}
          onStatusChange={(status) => {
            console.log('Status changed:', status);
          }}
          onPriorityChange={(priority) => {
            console.log('Priority changed:', priority);
          }}
          onCategoryChange={(category) => {
            console.log('Category changed:', category);  
          }}
          onTagsChange={(tags) => {
            console.log('Tags changed:', tags);
          }}
          onAssigneeChange={(assignee) => {
            console.log('Assignee changed:', assignee);
          }}
          onDueDateChange={(date) => {
            console.log('Due date changed:', date);
          }}
          onDescriptionChange={(desc) => {
            console.log('Description changed:', desc);
          }}
          onNameChange={(name) => {
            console.log('Name changed:', name);
          }}
          allowEdit={true}
          allowDelete={true}
          showHistory={false}
          historyData={[]}
          validationRules={{}}
          customFields={{}}
          permissions={['read', 'write']}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App;