import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  SelectChangeEvent,
} from '@mui/material';

// Type definitions for the component
interface LogUtility {
  debug: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
}

interface ItemData {
  itemId?: string | number;
  itemName?: string;
  itemDescription?: string;
  itemCategory?: string;
  itemPriority?: 'low' | 'medium' | 'high' | 'critical';
  itemTags?: string[];
  itemStatus?: 'active' | 'pending' | 'completed' | 'cancelled';
  itemDueDate?: string;
  itemAssignee?: string;
  itemCreatedBy?: string;
  itemCreatedAt?: string;
  itemUpdatedAt?: string;
  customFields?: Record<string, any>;
  historyData?: any[];
}

interface DialogConfig {
  showAdvanced?: boolean;
  enableNotifications?: boolean;
  autoSave?: boolean;
  readOnly?: boolean;
}

interface Callbacks {
  onSave?: (item: any) => void;
  onDelete?: (itemId: string | number) => void;
  onUpdate?: (item: any) => void;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onCategoryChange?: (category: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onAssigneeChange?: (assignee: string) => void;
  onDueDateChange?: (dueDate: string) => void;
  onDescriptionChange?: (description: string) => void;
  onNameChange?: (name: string) => void;
}

interface Permissions {
  allowEdit?: boolean;
  allowDelete?: boolean;
  validationRules?: Record<string, any>;
}

interface UiSettings {
  showHistory?: boolean;
}

interface ValidationData {
  name: string;
  description?: string;
  category: string;
  priority: string;
  tags: string[];
  status: string;
  dueDate?: string;
  assignee?: string;
  createdBy?: string;
  permissions?: string[];
  validationRules?: Record<string, any>;
  customFields?: Record<string, any>;
  uiConfig?: {
    showAdvanced?: boolean;
    enableNotifications?: boolean;
    autoSave?: boolean;
    readOnly?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
  };
}

interface UpdateData {
  itemData: any;
  updateType: 'bulk' | 'single' | 'generic';
  timestamp?: string;
  userId?: string;
  userRole?: string;
  permissions?: string[];
  validationLevel?: string;
  notificationSettings?: Record<string, any>;
  auditEnabled?: boolean;
  backupEnabled?: boolean;
  versionControl?: Record<string, any>;
  conflictResolution?: string;
  retryCount?: number;
  timeout?: number;
  batchMode?: boolean;
  asyncMode?: boolean;
}

interface ItemDetailsProps {
  open: boolean;
  onClose: () => void;
  itemData?: ItemData;
  dialogConfig?: DialogConfig;
  callbacks?: Callbacks;
  permissions?: Permissions;
  uiSettings?: UiSettings;
}

interface ValidationErrors {
  name?: string;
  category?: string;
  dueDate?: string;
  [key: string]: string | undefined;
}

// Logging utility for debugging
const log: LogUtility = {
  debug: (message: string, data: any = null): void => {
    console.debug(`[ItemDetails] ${message}`, data ? { data } : '');
  },
  error: (message: string, error: any = null): void => {
    console.error(`[ItemDetails ERROR] ${message}`, error ? { error } : '');
  },
  warn: (message: string, data: any = null): void => {
    console.warn(`[ItemDetails WARNING] ${message}`, data ? { data } : '');
  },
  info: (message: string, data: any = null): void => {
    console.info(`[ItemDetails] ${message}`, data ? { data } : '');
  }
};

/**
 * ItemDetails component for managing detailed item information
 * Refactored to TypeScript with comprehensive type safety
 * 
 * @param props - Component props with proper TypeScript interfaces
 */
function ItemDetails({ 
  open, 
  onClose, 
  itemData = {},
  dialogConfig = {},
  callbacks = {},
  permissions = {},
  uiSettings = {}
}: ItemDetailsProps): JSX.Element {
  // Destructure itemData object for better readability with type safety
  const {
    itemId,
    itemName,
    itemDescription,
    itemCategory,
    itemPriority,
    itemTags,
    itemStatus,
    itemDueDate,
    itemAssignee,
    itemCreatedBy,
    itemCreatedAt,
    itemUpdatedAt,
    customFields,
    historyData
  } = itemData;

  // Destructure dialogConfig object with defaults
  const {
    showAdvanced = false,
    enableNotifications = true,
    autoSave = false,
    readOnly = false
  } = dialogConfig;

  // Destructure callbacks object
  const {
    onSave,
    onDelete,
    onUpdate,
    onStatusChange,
    onPriorityChange,
    onCategoryChange,
    onTagsChange,
    onAssigneeChange,
    onDueDateChange,
    onDescriptionChange,
    onNameChange
  } = callbacks;

  // Destructure permissions object with defaults
  const {
    allowEdit = true,
    allowDelete = false,
    validationRules = {}
  } = permissions;

  // Destructure uiSettings object with defaults
  const {
    showHistory = false
  } = uiSettings;

  log.debug('ItemDetails component initialized', { 
    itemId, 
    itemName, 
    open, 
    readOnly, 
    allowEdit, 
    allowDelete 
  });

  // State with proper TypeScript types
  const [localName, setLocalName] = useState<string>(itemName || '');
  const [localDescription, setLocalDescription] = useState<string>(itemDescription || '');
  const [localCategory, setLocalCategory] = useState<string>(itemCategory || '');
  const [localPriority, setLocalPriority] = useState<'low' | 'medium' | 'high' | 'critical'>(itemPriority || 'medium');
  const [localTags, setLocalTags] = useState<string[]>(itemTags || []);
  const [localStatus, setLocalStatus] = useState<'active' | 'pending' | 'completed' | 'cancelled'>(itemStatus || 'active');
  const [localDueDate, setLocalDueDate] = useState<string>(itemDueDate || '');
  const [localAssignee, setLocalAssignee] = useState<string>(itemAssignee || '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  log.debug('Initial state set', { 
    localName, 
    localCategory, 
    localPriority, 
    localStatus 
  });

  // useEffect with proper dependency array
  useEffect(() => {
    log.debug('useEffect triggered - loading item data');
    if (itemId) {
      log.info('Loading item data for itemId', { itemId });
      try {
        // Future: Add item loading when function is implemented
        log.debug('Item loading would be performed here');
        // fetchItemDetails(itemId);
      } catch (error: any) {
        log.error('Runtime error: fetchItemDetails is not defined', error);
      }
    } else {
      log.warn('useEffect called without itemId');
    }
  }, [itemId]); // Fixed dependency array

  // Update local state when itemData changes
  useEffect(() => {
    log.debug('Item data changed, updating local state');
    setLocalName(itemName || '');
    setLocalDescription(itemDescription || '');
    setLocalCategory(itemCategory || '');
    setLocalPriority(itemPriority || 'medium');
    setLocalTags(itemTags || []);
    setLocalStatus(itemStatus || 'active');
    setLocalDueDate(itemDueDate || '');
    setLocalAssignee(itemAssignee || '');
  }, [itemName, itemDescription, itemCategory, itemPriority, itemTags, itemStatus, itemDueDate, itemAssignee]);

  // Enhanced save handler with type safety
  const handleSave = (): void => {
    log.info('handleSave called - starting save process');
    
    try {
      // Validate before saving
      const validationData: ValidationData = {
        name: localName,
        description: localDescription,
        category: localCategory,
        priority: localPriority,
        tags: localTags,
        status: localStatus,
        dueDate: localDueDate,
        assignee: localAssignee,
        createdBy: itemCreatedBy,
        permissions: permissions ? Object.keys(permissions) : [],
        validationRules,
        customFields
      };

      if (!validateAndUpdateItem(validationData)) {
        log.error('Validation failed, cannot save');
        return;
      }

      const updatedItem = {
        id: itemId,
        name: localName,
        description: localDescription,
        category: localCategory,
        priority: localPriority,
        tags: localTags,
        status: localStatus,
        dueDate: localDueDate,
        assignee: localAssignee
      };
      
      log.debug('Prepared item data for save', updatedItem);
      
      log.info('Calling onSave with updated item');
      onSave?.(updatedItem);
      setIsDirty(false);
      log.info('Save completed successfully');
    } catch (error: any) {
      log.error('Error during save operation', error);
      throw error;
    }
  };

  // Refactored validation function with comprehensive type safety
  const validateAndUpdateItem = (validationData: ValidationData): boolean => {
    log.info('validateAndUpdateItem called with object parameter - refactored successfully');
    
    // Destructure the validationData object for better readability
    const {
      name,
      description,
      category,
      priority,
      tags,
      status,
      dueDate,
      assignee,
      createdBy,
      permissions,
      validationRules,
      customFields,
      uiConfig = {}
    } = validationData;

    // Destructure UI configuration with defaults
    const {
      showAdvanced = false,
      enableNotifications = true,
      autoSave = false,
      readOnly = false,
      allowEdit = true,
      allowDelete = false
    } = uiConfig;

    log.debug('validateAndUpdateItem called with structured data', {
      name, description, category, priority, tags, status, dueDate, assignee
    });
    
    let valid = true;
    const newErrors: ValidationErrors = {};

    // Enhanced validation with proper error messages
    if (!name || name.trim().length === 0) {
      log.debug('Validation failed: name is required');
      valid = false;
      newErrors.name = 'Name is required';
    } else if (name.trim().length > 100) {
      log.debug('Validation failed: name too long');
      valid = false;
      newErrors.name = 'Name must be 100 characters or less';
    }

    const validCategories = ['work', 'personal', 'urgent', 'general'];
    if (category && !validCategories.includes(category)) {
      log.debug('Validation failed: invalid category', { category });
      valid = false;
      newErrors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
    }

    // Enhanced date validation
    if (dueDate) {
      try {
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) {
          log.debug('Validation failed: invalid due date format', { dueDate });
          valid = false;
          newErrors.dueDate = 'Invalid due date format';
        } else if (date < new Date()) {
          log.debug('Validation failed: due date in the past', { dueDate });
          valid = false;
          newErrors.dueDate = 'Due date cannot be in the past';
        }
      } catch (error: any) {
        log.error('Error validating due date', { error: error.message, dueDate });
        valid = false;
        newErrors.dueDate = 'Date validation error';
      }
    }

    log.debug('Validation completed', { valid, errorCount: Object.keys(newErrors).length });
    setErrors(newErrors);
    setIsValid(valid);
    return valid;
  };

  // Refactored update processing function with comprehensive type safety
  const processItemUpdate = (updateData: UpdateData): { success: boolean; type: string; message?: string; error?: string } => {
    log.info('processItemUpdate called with object parameter - refactored successfully');
    
    // Destructure the updateData object for better readability
    const {
      itemData,
      updateType,
      timestamp,
      userId,
      userRole,
      permissions,
      validationLevel,
      notificationSettings,
      auditEnabled,
      backupEnabled,
      versionControl,
      conflictResolution,
      retryCount,
      timeout,
      batchMode,
      asyncMode
    } = updateData;

    log.debug('processItemUpdate parameters', { 
      updateType, 
      userId, 
      userRole, 
      batchMode, 
      asyncMode 
    });
    
    try {
      if (updateType === 'bulk') {
        log.info('Processing bulk update');
        try {
          // Future: Add bulk processing when function is implemented
          log.debug('Bulk update processing would be performed here');
          // return processBulkUpdate(itemData, userId, permissions);
          return { success: true, type: 'bulk', message: 'Bulk update simulated' };
        } catch (error: any) {
          log.error('Runtime error: processBulkUpdate function is not defined', error);
          return { success: false, type: 'bulk', error: 'Bulk update failed' };
        }
      } else if (updateType === 'single') {
        log.info('Processing single update');
        try {
          // Future: Add single processing when function is implemented
          log.debug('Single update processing would be performed here');
          // return processSingleUpdate(itemData, userId, timestamp);
          return { success: true, type: 'single', message: 'Single update simulated' };
        } catch (error: any) {
          log.error('Runtime error: processSingleUpdate function is not defined', error);
          return { success: false, type: 'single', error: 'Single update failed' };
        }
      }
      
      log.info('Processing generic update (fallback)');
      try {
        // Future: Add generic processing when function is implemented
        log.debug('Generic update processing would be performed here');
        // return processGenericUpdate(itemData);
        return { success: true, type: 'generic', message: 'Generic update simulated' };
      } catch (error: any) {
        log.error('Runtime error: processGenericUpdate function is not defined', error);
        return { success: false, type: 'generic', error: 'Generic update failed' };
      }
    } catch (error: any) {
      log.error('Error in processItemUpdate', error);
      throw error;
    }
  };

  // Enhanced input change handler with type safety
  const handleInputChange = (field: string, value: string): void => {
    log.debug('handleInputChange called', { field, value });
    setIsDirty(true);
    
    try {
      switch (field) {
        case 'name':
          log.debug('Updating name field', { value });
          setLocalName(value);
          onNameChange?.(value);
          break;
        case 'description':
          log.debug('Updating description field', { value });
          setLocalDescription(value);
          onDescriptionChange?.(value);
          break;
        case 'category':
          log.debug('Updating category field', { value });
          setLocalCategory(value);
          onCategoryChange?.(value);
          break;
        case 'priority':
          log.debug('Updating priority field', { value });
          setLocalPriority(value as 'low' | 'medium' | 'high' | 'critical');
          onPriorityChange?.(value);
          break;
        case 'status':
          log.debug('Updating status field', { value });
          setLocalStatus(value as 'active' | 'pending' | 'completed' | 'cancelled');
          onStatusChange?.(value);
          break;
        case 'dueDate':
          log.debug('Updating dueDate field', { value });
          setLocalDueDate(value);
          onDueDateChange?.(value);
          break;
        case 'assignee':
          log.debug('Updating assignee field', { value });
          setLocalAssignee(value);
          onAssigneeChange?.(value);
          break;
        default:
          log.warn('Unknown field in handleInputChange', { field, value });
      }
    } catch (error: any) {
      log.error('Error in handleInputChange', { error: error.message, field, value });
    }
  };

  // Enhanced date formatting with proper error handling
  const formatCreatedDate = (date: string): string => {
    log.debug('formatCreatedDate called', { date });
    try {
      if (!date) return 'Unknown';
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        log.warn('Invalid date format', { date });
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error: any) {
      log.error('Error formatting date', { error: error.message, date });
      return 'Error formatting date';
    }
  };

  // Handle select changes with proper typing
  const handleSelectChange = (event: SelectChangeEvent<string>, field: string): void => {
    handleInputChange(field, event.target.value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {itemId ? 'Edit Item Details' : 'New Item Details'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Item Name"
                value={localName}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={readOnly}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={localCategory}
                  label="Category *"
                  onChange={(e) => handleSelectChange(e, 'category')}
                  disabled={readOnly}
                  required
                >
                  <MenuItem value="work">Work</MenuItem>
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={localDescription}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={readOnly}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={localPriority}
                  label="Priority"
                  onChange={(e) => handleSelectChange(e, 'priority')}
                  disabled={readOnly}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={localStatus}
                  label="Status"
                  onChange={(e) => handleSelectChange(e, 'status')}
                  disabled={readOnly}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={localDueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={readOnly}
                error={!!errors.dueDate}
                helperText={errors.dueDate}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Assignee"
                value={localAssignee}
                onChange={(e) => handleInputChange('assignee', e.target.value)}
                disabled={readOnly}
              />
            </Grid>
            
            {showAdvanced && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Advanced Options
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enableNotifications}
                        onChange={(e) => {
                          log.debug('Notification toggle clicked', { checked: e.target.checked });
                          try {
                            // Future: Add notification toggle handling
                            log.debug('Notification toggle would be handled here');
                          } catch (error: any) {
                            log.error('Error handling notification toggle', error);
                          }
                        }}
                      />
                    }
                    label="Enable Notifications"
                    disabled={readOnly}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoSave}
                        onChange={(e) => {
                          log.debug('Auto save toggle clicked', { checked: e.target.checked });
                        }}
                      />
                    }
                    label="Auto Save"
                    disabled={readOnly}
                  />
                </Grid>
              </>
            )}
            
            {itemCreatedAt && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Created: {formatCreatedDate(itemCreatedAt)} {itemCreatedBy && `by ${itemCreatedBy}`}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => {
          log.debug('Cancel button clicked');
          onClose();
        }}>
          Cancel
        </Button>
        {allowEdit && !readOnly && (
          <Button 
            onClick={() => {
              log.debug('Save button clicked');
              handleSave();
            }} 
            variant="contained"
            disabled={!isValid || !isDirty}
          >
            Save Changes
          </Button>
        )}
        {allowDelete && (
          <Button 
            onClick={() => {
              log.debug('Delete button clicked');
              if (itemId && onDelete) {
                onDelete(itemId);
              }
            }} 
            color="error"
          >
            Delete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ItemDetails;
