# Error Handling Utilities Documentation

## Overview
This document describes the error handling utilities and components available in the Lost & Found application.

## Components

### 1. ErrorBoundary Component
**Location:** `components/ErrorBoundary.js`

React Error Boundary that catches JavaScript errors anywhere in the component tree.

**Features:**
- Catches unhandled errors in React components
- Displays user-friendly error screen
- Shows detailed error info in development mode
- Provides "Try Again" functionality
- Logs errors for monitoring

**Usage:**
```javascript
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary onReset={() => router.replace('/')}>
  <YourComponent />
</ErrorBoundary>
```

**Props:**
- `onReset` (optional): Callback function when user clicks "Try Again"
- `children`: Components to wrap

---

### 2. OfflineBanner Component
**Location:** `components/OfflineBanner.js`

Displays a banner when the app loses internet connection.

**Features:**
- Automatic detection of network status
- Smooth slide-in/out animation
- Non-intrusive design
- Real-time connection monitoring

**Usage:**
```javascript
import OfflineBanner from '../components/OfflineBanner';

function App() {
  return (
    <>
      <OfflineBanner />
      <YourContent />
    </>
  );
}
```

---

## Utilities

### 1. Connection Monitor
**Location:** `lib/connectionMonitor.js`

Monitors network connectivity and provides status updates.

**Functions:**

#### `useNetworkStatus()`
Hook to monitor network connection status.

```javascript
import { useNetworkStatus } from '../lib/connectionMonitor';

function MyComponent() {
  const { isConnected, isOnline, isOffline, connectionType } = useNetworkStatus();
  
  if (isOffline) {
    return <Text>You're offline</Text>;
  }
  
  return <Text>Connected via {connectionType}</Text>;
}
```

#### `checkConnection()`
Check if currently connected to network.

```javascript
import { checkConnection } from '../lib/connectionMonitor';

async function handleAction() {
  const isConnected = await checkConnection();
  if (!isConnected) {
    Alert.alert('No Connection', 'Please check your internet');
    return;
  }
  // Proceed with action
}
```

#### `waitForConnection(timeout)`
Wait for network connection with timeout.

```javascript
import { waitForConnection } from '../lib/connectionMonitor';

async function syncData() {
  try {
    await waitForConnection(30000); // Wait up to 30 seconds
    // Connection restored, proceed
  } catch (error) {
    Alert.alert('Timeout', 'Could not establish connection');
  }
}
```

#### `executeWhenOnline(fn, options)`
Execute function when online, with automatic retry.

```javascript
import { executeWhenOnline } from '../lib/connectionMonitor';

async function saveData() {
  await executeWhenOnline(
    async () => {
      await supabase.from('items').insert(data);
    },
    { timeout: 30000, retryOnFailure: true }
  );
}
```

---

### 2. Error Handler
**Location:** `lib/errorHandler.js`

Centralized error handling utility with consistent patterns.

**Error Types:**
```javascript
import { ErrorType } from '../lib/errorHandler';

ErrorType.NETWORK
ErrorType.DATABASE
ErrorType.AUTHENTICATION
ErrorType.VALIDATION
ErrorType.PERMISSION
ErrorType.NOT_FOUND
ErrorType.UNKNOWN
```

**Functions:**

#### `categorizeError(error)`
Categorize error based on message or code.

```javascript
import { categorizeError, ErrorType } from '../lib/errorHandler';

try {
  await fetchData();
} catch (error) {
  const type = categorizeError(error);
  if (type === ErrorType.NETWORK) {
    // Handle network error
  }
}
```

#### `getUserFriendlyMessage(error, context)`
Get user-friendly error message.

```javascript
import { getUserFriendlyMessage } from '../lib/errorHandler';

try {
  await saveItem();
} catch (error) {
  const { title, message } = getUserFriendlyMessage(error, 'Failed to save item');
  Alert.alert(title, message);
}
```

#### `showErrorAlert(error, options)`
Show error alert with retry option.

```javascript
import { showErrorAlert } from '../lib/errorHandler';

try {
  await loadData();
} catch (error) {
  showErrorAlert(error, {
    context: 'Loading data',
    onRetry: () => loadData(),
    customTitle: 'Load Failed',
  });
}
```

#### `logError(error, context, additionalData)`
Log error for debugging and monitoring.

```javascript
import { logError } from '../lib/errorHandler';

try {
  await processPayment();
} catch (error) {
  logError(error, 'Payment Processing', {
    userId: user.id,
    amount: 100,
  });
  throw error;
}
```

#### `handleSupabaseError(error, context)`
Handle Supabase-specific errors.

```javascript
import { handleSupabaseError } from '../lib/errorHandler';

try {
  await supabase.from('items').insert(data);
} catch (error) {
  const { title, message } = handleSupabaseError(error, 'Creating item');
  Alert.alert(title, message);
}
```

#### `retryWithBackoff(fn, maxRetries, initialDelay, onRetry)`
Retry function with exponential backoff.

```javascript
import { retryWithBackoff } from '../lib/errorHandler';

const data = await retryWithBackoff(
  async () => await fetchData(),
  3, // max retries
  1000, // initial delay (ms)
  (attempt, max, delay) => {
    console.log(`Retry ${attempt}/${max} in ${delay}ms`);
  }
);
```

#### `withErrorHandling(fn, options)`
Wrap async function with error handling.

```javascript
import { withErrorHandling } from '../lib/errorHandler';

const safeFetchData = withErrorHandling(
  async () => {
    const { data } = await supabase.from('items').select('*');
    return data;
  },
  {
    context: 'Fetching items',
    showAlert: true,
    defaultValue: [],
  }
);

// Use it
const items = await safeFetchData();
```

#### `validateRequired(data, requiredFields)`
Validate required fields.

```javascript
import { validateRequired } from '../lib/errorHandler';

try {
  validateRequired(formData, ['name', 'email', 'phone']);
  // All required fields present
} catch (error) {
  Alert.alert('Missing Fields', error.message);
}
```

#### `isRetryableError(error)`
Check if error is retryable.

```javascript
import { isRetryableError } from '../lib/errorHandler';

try {
  await saveData();
} catch (error) {
  if (isRetryableError(error)) {
    // Retry the operation
    await retryWithBackoff(() => saveData());
  } else {
    // Don't retry, show error
    Alert.alert('Error', error.message);
  }
}
```

---

## Usage Examples

### Example 1: Fetch Data with Error Handling
```javascript
import { showErrorAlert, logError } from '../lib/errorHandler';

async function fetchItems() {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*');
    
    if (error) throw error;
    setItems(data || []);
  } catch (error) {
    logError(error, 'Fetching items');
    showErrorAlert(error, {
      context: 'Loading items',
      onRetry: () => fetchItems(),
    });
  } finally {
    setLoading(false);
  }
}
```

### Example 2: Multi-step Operation with Rollback
```javascript
import { handleSupabaseError, logError } from '../lib/errorHandler';

async function createItemWithPhoto() {
  let photoUrl = null;
  
  try {
    // Step 1: Upload photo
    const { data: photoData, error: photoError } = await supabase.storage
      .from('photos')
      .upload(fileName, file);
    
    if (photoError) {
      throw new Error(`Photo upload failed: ${photoError.message}`);
    }
    
    photoUrl = photoData.path;
    
    // Step 2: Create item
    const { error: itemError } = await supabase
      .from('items')
      .insert({ ...itemData, photo_url: photoUrl });
    
    if (itemError) {
      // Rollback: Delete uploaded photo
      await supabase.storage.from('photos').remove([photoUrl]);
      throw new Error(`Item creation failed: ${itemError.message}`);
    }
    
    Alert.alert('Success', 'Item created successfully');
  } catch (error) {
    logError(error, 'Creating item with photo');
    const { title, message } = handleSupabaseError(error);
    Alert.alert(title, message);
  }
}
```

### Example 3: Network-Aware Operation
```javascript
import { executeWhenOnline } from '../lib/connectionMonitor';
import { showErrorAlert } from '../lib/errorHandler';

async function syncData() {
  try {
    await executeWhenOnline(
      async () => {
        const { error } = await supabase
          .from('items')
          .upsert(localData);
        
        if (error) throw error;
        Alert.alert('Success', 'Data synced');
      },
      { timeout: 30000, retryOnFailure: true }
    );
  } catch (error) {
    showErrorAlert(error, {
      context: 'Syncing data',
      customMessage: 'Could not sync data. Please try again when online.',
    });
  }
}
```

### Example 4: Form Validation
```javascript
import { validateRequired, showErrorAlert } from '../lib/errorHandler';

async function handleSubmit() {
  try {
    // Validate required fields
    validateRequired(formData, ['name', 'email', 'category']);
    
    // Proceed with submission
    await saveItem(formData);
    Alert.alert('Success', 'Item saved');
  } catch (error) {
    if (error.type === 'VALIDATION') {
      Alert.alert('Missing Fields', error.message);
    } else {
      showErrorAlert(error, { context: 'Saving item' });
    }
  }
}
```

---

## Best Practices

### 1. Always Log Errors
```javascript
try {
  await operation();
} catch (error) {
  logError(error, 'Operation context', { userId, itemId });
  // Handle error
}
```

### 2. Provide Retry Options
```javascript
showErrorAlert(error, {
  context: 'Loading data',
  onRetry: () => loadData(),
});
```

### 3. Use Specific Error Messages
```javascript
// Bad
Alert.alert('Error', 'Something went wrong');

// Good
const { title, message } = getUserFriendlyMessage(error, 'Loading items');
Alert.alert(title, message);
```

### 4. Handle Network Issues
```javascript
const { isOffline } = useNetworkStatus();

if (isOffline) {
  Alert.alert('Offline', 'This action requires internet connection');
  return;
}
```

### 5. Validate Before Operations
```javascript
try {
  validateRequired(data, ['name', 'email']);
  await saveData(data);
} catch (error) {
  // Handle validation or save error
}
```

---

## Integration Checklist

- [ ] Wrap root component with ErrorBoundary
- [ ] Add OfflineBanner to main layout
- [ ] Use showErrorAlert for user-facing errors
- [ ] Log all errors with logError
- [ ] Validate required fields before operations
- [ ] Check network status for critical operations
- [ ] Provide retry options for retryable errors
- [ ] Use handleSupabaseError for database operations

---

## Future Enhancements

1. **Error Monitoring Service Integration**
   - Sentry, LogRocket, or similar
   - Automatic error reporting
   - User session tracking

2. **Offline Queue**
   - Queue operations when offline
   - Auto-sync when connection restored
   - Conflict resolution

3. **Error Analytics**
   - Track error frequency
   - Identify problematic areas
   - Monitor error trends

4. **Localization**
   - Multi-language error messages
   - Region-specific formatting
   - Cultural considerations

---

## Related Documentation
- [ERROR_HANDLING_IMPROVEMENTS.md](./ERROR_HANDLING_IMPROVEMENTS.md)
- [CODE_DOCUMENTATION.md](./CODE_DOCUMENTATION.md)
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
