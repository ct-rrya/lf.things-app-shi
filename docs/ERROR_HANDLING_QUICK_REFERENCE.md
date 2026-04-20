# Error Handling Quick Reference Guide

## Quick Start

### Import What You Need
```javascript
// For error alerts and logging
import { showErrorAlert, logError, handleSupabaseError } from '../lib/errorHandler';

// For network monitoring
import { useNetworkStatus, checkConnection } from '../lib/connectionMonitor';

// For components
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineBanner from '../components/OfflineBanner';
```

---

## Common Scenarios

### 1. Fetch Data from Database
```javascript
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
    setItems([]);
  } finally {
    setLoading(false);
  }
}
```

### 2. Real-time Subscription
```javascript
const channel = supabase
  .channel('my_channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, 
    (payload) => {
      // Handle change
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIPTION_ERROR') {
      console.error('Subscription error - retrying...');
      setTimeout(() => fetchItems(), 2000);
    }
  });
```

### 3. Multi-step Operation
```javascript
async function createWithPhoto() {
  let photoUrl = null;
  
  try {
    // Step 1
    const { data: photo, error: e1 } = await uploadPhoto();
    if (e1) throw new Error(`Upload failed: ${e1.message}`);
    photoUrl = photo.url;
    
    // Step 2
    const { error: e2 } = await createItem({ photo_url: photoUrl });
    if (e2) {
      await deletePhoto(photoUrl); // Rollback
      throw new Error(`Create failed: ${e2.message}`);
    }
    
    Alert.alert('Success', 'Item created');
  } catch (error) {
    logError(error, 'Creating item');
    Alert.alert('Error', error.message);
  }
}
```

### 4. Form Validation
```javascript
import { validateRequired } from '../lib/errorHandler';

async function handleSubmit() {
  try {
    validateRequired(formData, ['name', 'email', 'category']);
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

### 5. Check Network Before Action
```javascript
import { checkConnection } from '../lib/connectionMonitor';

async function syncData() {
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    Alert.alert('Offline', 'This action requires internet connection');
    return;
  }
  
  // Proceed with sync
}
```

### 6. Use Network Status Hook
```javascript
import { useNetworkStatus } from '../lib/connectionMonitor';

function MyComponent() {
  const { isOffline } = useNetworkStatus();
  
  if (isOffline) {
    return <Text>You're offline. Some features unavailable.</Text>;
  }
  
  return <YourContent />;
}
```

---

## Error Alert Patterns

### Basic Alert
```javascript
showErrorAlert(error, {
  context: 'Loading data',
});
```

### Alert with Retry
```javascript
showErrorAlert(error, {
  context: 'Saving item',
  onRetry: () => saveItem(),
});
```

### Custom Message
```javascript
showErrorAlert(error, {
  customTitle: 'Upload Failed',
  customMessage: 'Could not upload photo. Please try again.',
  onRetry: () => uploadPhoto(),
});
```

---

## Supabase Error Handling

### Standard Pattern
```javascript
try {
  const { data, error } = await supabase.from('items').insert(item);
  if (error) throw error;
  return data;
} catch (error) {
  const { title, message } = handleSupabaseError(error, 'Creating item');
  Alert.alert(title, message);
}
```

---

## Validation Patterns

### Required Fields
```javascript
import { validateRequired } from '../lib/errorHandler';

try {
  validateRequired(data, ['name', 'email', 'phone']);
  // All fields present
} catch (error) {
  Alert.alert('Missing Fields', error.message);
  // error.missingFields contains array of missing field names
}
```

### Data Before Rendering
```javascript
function renderItem({ item }) {
  if (!item?.id || !item?.name) {
    console.warn('Invalid item data:', item);
    return null;
  }
  
  return <ItemCard item={item} />;
}
```

---

## Retry Patterns

### Exponential Backoff
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

### Check if Retryable
```javascript
import { isRetryableError } from '../lib/errorHandler';

try {
  await saveData();
} catch (error) {
  if (isRetryableError(error)) {
    await retryWithBackoff(() => saveData());
  } else {
    Alert.alert('Error', error.message);
  }
}
```

---

## Component Patterns

### Wrap with Error Boundary
```javascript
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary onReset={() => router.replace('/')}>
  <YourComponent />
</ErrorBoundary>
```

### Add Offline Banner
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

## Logging Patterns

### Basic Logging
```javascript
import { logError } from '../lib/errorHandler';

try {
  await operation();
} catch (error) {
  logError(error, 'Operation context');
  throw error;
}
```

### Logging with Additional Data
```javascript
logError(error, 'Payment processing', {
  userId: user.id,
  amount: 100,
  paymentMethod: 'card',
});
```

---

## Error Types

```javascript
import { ErrorType } from '../lib/errorHandler';

ErrorType.NETWORK       // Network/connection errors
ErrorType.DATABASE      // Database/query errors
ErrorType.AUTHENTICATION // Auth errors
ErrorType.VALIDATION    // Validation errors
ErrorType.PERMISSION    // Permission errors
ErrorType.NOT_FOUND     // Resource not found
ErrorType.UNKNOWN       // Unknown errors
```

---

## Cheat Sheet

| Scenario | Function | Import From |
|----------|----------|-------------|
| Show error alert | `showErrorAlert(error, options)` | `lib/errorHandler` |
| Log error | `logError(error, context, data)` | `lib/errorHandler` |
| Handle Supabase error | `handleSupabaseError(error, context)` | `lib/errorHandler` |
| Validate fields | `validateRequired(data, fields)` | `lib/errorHandler` |
| Retry with backoff | `retryWithBackoff(fn, retries, delay)` | `lib/errorHandler` |
| Check network | `checkConnection()` | `lib/connectionMonitor` |
| Network status hook | `useNetworkStatus()` | `lib/connectionMonitor` |
| Wait for connection | `waitForConnection(timeout)` | `lib/connectionMonitor` |
| Execute when online | `executeWhenOnline(fn, options)` | `lib/connectionMonitor` |

---

## Common Mistakes to Avoid

### ❌ Don't Do This
```javascript
// No error handling
const { data } = await supabase.from('items').select('*');
setItems(data);

// Generic error message
Alert.alert('Error', 'Something went wrong');

// No retry option
Alert.alert('Error', error.message);

// Ignoring subscription errors
.subscribe();
```

### ✅ Do This Instead
```javascript
// Proper error handling
try {
  const { data, error } = await supabase.from('items').select('*');
  if (error) throw error;
  setItems(data || []);
} catch (error) {
  logError(error, 'Fetching items');
  showErrorAlert(error, {
    context: 'Loading items',
    onRetry: () => fetchItems(),
  });
  setItems([]);
}

// Subscription with error handler
.subscribe((status) => {
  if (status === 'SUBSCRIPTION_ERROR') {
    console.error('Error - retrying...');
    setTimeout(() => refetch(), 2000);
  }
});
```

---

## Testing Your Error Handling

### Manual Tests
1. Turn off WiFi and try operations
2. Simulate database errors (invalid queries)
3. Test with missing required fields
4. Test multi-step operations with failures
5. Test real-time subscriptions with network drops

### Console Checks
- Look for error logs in console
- Verify retry attempts are logged
- Check subscription status messages
- Confirm rollback operations

---

## Need More Help?

- **Full Documentation:** [ERROR_HANDLING_UTILITIES.md](./ERROR_HANDLING_UTILITIES.md)
- **Implementation Details:** [ERROR_HANDLING_IMPROVEMENTS.md](./ERROR_HANDLING_IMPROVEMENTS.md)
- **Complete Summary:** [ERROR_HANDLING_SUMMARY.md](./ERROR_HANDLING_SUMMARY.md)
