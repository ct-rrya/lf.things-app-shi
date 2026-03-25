# Quick Fix Steps for Chat Error

## The Problem
You're getting this error when trying to send messages:
```
Error sending message: new row violates row-level security policy for table "match_messages"
```

## The Solution (3 Steps)

### Step 1: Open Supabase SQL Editor
1. Go to https://rmxhkbytedkamqpeurga.supabase.co
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Fix
Copy and paste the ENTIRE contents of `FINAL-CHAT-FIX.sql` into the SQL editor and click "Run".

### Step 3: Restart Your App
1. Close the app completely on your phone
2. Reopen it
3. Try sending a message again

---

## What This Does

The SQL script:
- Fixes the security policies on your chat tables
- Allows authenticated users to send and read messages
- Verifies the fix worked

---

## Expected Output

After running the SQL, you should see:
```
✅ Chat fix complete! Policies updated for chat_messages and chat_threads tables.
```

And a table showing the policies that were created.

---

## If It Still Doesn't Work

1. Check which tables you have by running this query:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND (table_name LIKE '%message%' OR table_name LIKE '%thread%');
   ```

2. If you DON'T see `chat_messages` and `chat_threads`:
   - First run `complete-workflow-schema.sql`
   - Then run `FINAL-CHAT-FIX.sql`

3. If you still get errors, share the exact error message and the output from Step 1 above.

---

## Why This Happened

Your database has Row Level Security (RLS) policies that were blocking message inserts. The fix updates these policies to allow authenticated users to send messages in their own chat threads.
