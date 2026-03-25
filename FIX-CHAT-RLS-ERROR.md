# Fix Chat RLS Error - Row Level Security

## Error Message
```
Error sending message: {"code": "42501", "details": null, "hint": null, 
"message": "new row violates row-level security policy for table \"match_messages\""}
```

## What This Means
Your Supabase database has Row Level Security (RLS) enabled on the `match_messages` table, but the security policies are either missing or incorrectly configured. This prevents users from sending messages in the chat.

## Quick Fix

### Step 1: Run the SQL Fix
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `fix-match-messages-rls.sql`
5. Click **Run** or press `Ctrl+Enter`

### Step 2: Verify It Worked
After running the SQL, you should see:
```
Success. No rows returned
```

Then check the policies were created:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'match_messages';
```

You should see:
- `Match participants can insert messages`
- `Match participants can view messages`

### Step 3: Test the Chat
1. Restart your app
2. Try sending a message in a match chat
3. Message should send successfully

## What the Fix Does

The SQL script creates two RLS policies:

### Policy 1: Insert Messages
Allows users to insert messages if they are:
- The owner of the lost item in the match, OR
- The reporter of the found item in the match

### Policy 2: View Messages
Allows users to view messages if they are:
- The owner of the lost item in the match, OR
- The reporter of the found item in the match

## Alternative: Disable RLS (Not Recommended)

If you want to temporarily disable RLS for testing:

```sql
ALTER TABLE match_messages DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: This removes all security and allows anyone to read/write messages. Only use for testing!

## Verify Your Database Schema

Make sure you have these tables:
- `match_messages` - Stores chat messages
- `ai_matches` - Stores matches between lost and found items
- `items` - Stores lost items
- `found_items` - Stores found items

Check with:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('match_messages', 'ai_matches', 'items', 'found_items');
```

## Common Issues

### Issue 1: Table doesn't exist
**Error**: `relation "match_messages" does not exist`

**Fix**: Run the schema creation script first:
```sql
-- See match-messages-schema.sql or complete-workflow-schema.sql
```

### Issue 2: Foreign key constraints
**Error**: `violates foreign key constraint`

**Fix**: Make sure the match_id exists in ai_matches table before sending messages.

### Issue 3: Auth user not found
**Error**: `auth.uid() returns null`

**Fix**: Make sure user is logged in:
```javascript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  Alert.alert('Error', 'Please log in to send messages');
  return;
}
```

## Testing the Fix

After applying the fix, test these scenarios:

1. **Lost item owner sends message**:
   - Should work ✅
   
2. **Found item reporter sends message**:
   - Should work ✅
   
3. **Random user tries to send message**:
   - Should fail ❌ (correct behavior)

4. **View messages in match**:
   - Both participants should see all messages ✅

## Database Structure

For reference, here's how the tables relate:

```
items (lost items)
  └─ user_id → auth.users.id

found_items (found items)
  └─ reporter_id → auth.users.id

ai_matches (matches)
  ├─ lost_item_id → items.id
  └─ found_item_id → found_items.id

match_messages (chat messages)
  ├─ match_id → ai_matches.id
  ├─ sender_id → auth.users.id
  └─ message (text)
```

## Prevention

To avoid this issue in the future:

1. **Always create RLS policies** when creating new tables
2. **Test with different users** to ensure policies work
3. **Document your policies** in your schema files
4. **Use the SQL Editor** to verify policies exist

## Need More Help?

If the error persists:

1. Check Supabase logs:
   - Dashboard → Logs → Postgres Logs
   
2. Verify user authentication:
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user?.id);
   ```

3. Check match exists:
   ```javascript
   const { data: match } = await supabase
     .from('ai_matches')
     .select('*')
     .eq('id', matchId)
     .single();
   console.log('Match:', match);
   ```

4. Verify user is participant:
   ```javascript
   // Check if user owns lost item or found item
   const { data: lostItem } = await supabase
     .from('items')
     .select('user_id')
     .eq('id', match.lost_item_id)
     .single();
   
   const { data: foundItem } = await supabase
     .from('found_items')
     .select('reporter_id')
     .eq('id', match.found_item_id)
     .single();
   
   console.log('Is participant:', 
     lostItem?.user_id === user.id || 
     foundItem?.reporter_id === user.id
   );
   ```

---

**Status**: Run `fix-match-messages-rls.sql` to fix the issue
**Priority**: High - Chat functionality is broken without this fix
