# Fix Duplicate Chat Thread Error

## Error Message
```
Error confirming match: {"code": "23505", "details": null, "hint": null, 
"message": "duplicate key value violates unique constraint \"chat_threads_match_id_key\""}
```

## What This Means
The app was trying to create a new chat thread for a match that already has one. The database has a unique constraint on `match_id` in the `chat_threads` table, preventing duplicates.

## Fix Applied ✅

The code in `app/found/[id].js` has been updated to:
1. **Check if a thread exists** for the match
2. **Use existing thread** if found
3. **Create new thread** only if none exists
4. **Navigate to the correct thread** either way

## How It Works Now

### Before (Broken):
```javascript
// Always tried to insert, causing duplicate error
const { data: threadData } = await supabase
  .from('chat_threads')
  .insert({ match_id: matchInfo.id, ... })
```

### After (Fixed):
```javascript
// Check first
const { data: existingThread } = await supabase
  .from('chat_threads')
  .select('id')
  .eq('match_id', matchInfo.id)
  .single();

if (existingThread) {
  // Use existing thread
  threadId = existingThread.id;
} else {
  // Create new thread
  const { data: threadData } = await supabase
    .from('chat_threads')
    .insert({ match_id: matchInfo.id, ... });
  threadId = threadData.id;
}

// Navigate to thread
router.push(`/chat/${threadId}`);
```

## Testing

After this fix:
1. ✅ First time confirming a match → Creates new thread
2. ✅ Confirming same match again → Uses existing thread
3. ✅ No duplicate error
4. ✅ Chat opens correctly

## Why This Happened

The database schema has a unique constraint:
```sql
ALTER TABLE chat_threads 
ADD CONSTRAINT chat_threads_match_id_key 
UNIQUE (match_id);
```

This ensures one thread per match, which is correct. The app code just needed to respect this constraint.

## Related Files
- `app/found/[id].js` - Fixed ✅
- `complete-workflow-schema.sql` - Has the unique constraint

---

**Status**: Fixed ✅
**Action Required**: None - code already updated
**Test**: Try confirming a match multiple times
