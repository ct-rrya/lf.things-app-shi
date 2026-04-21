# 🚀 Run This to Fix Empty Custody Log

## The Problem
Your custody log is empty even though you have items with status `at_admin` because:
- The automatic trigger hasn't been created yet
- Existing items haven't been backfilled into the custody log

## The Solution
Run the SQL script to:
1. Create a trigger that automatically logs custody changes
2. Backfill existing items with status `at_admin`

---

## Steps to Run

### 1. Open Supabase SQL Editor
- Go to your Supabase Dashboard
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 2. Copy and Paste the Script
Copy the entire contents of `database/auto-custody-log-trigger.sql` and paste it into the SQL Editor.

### 3. Run the Script
- Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)
- Wait for the success message

### 4. Verify Results
You should see two success messages:
```
✓ Trigger created successfully!
✓ Backfill complete! X custody_entries_created
```

### 5. Refresh Your Admin Custody Page
- Go back to your app
- Navigate to Admin → Custody Log
- You should now see entries for all items with status `at_admin`

---

## What This Does

### Automatic Logging (Going Forward)
From now on, whenever an item's status changes:
- **Status changes TO `at_admin`** → Automatically creates a "received" custody log entry
- **Status changes FROM `at_admin` TO `safe`** → Automatically creates a "returned" custody log entry

### Backfill (Existing Items)
Creates "received" custody log entries for all items that are currently `at_admin` but don't have a custody log entry yet.

---

## Testing

After running the script, test it by:

1. **Check existing items**: Go to Admin → Custody Log and verify entries appear
2. **Test new changes**: 
   - Go to Admin → Items
   - Find an item with status "lost" or "safe"
   - Change its status to "at_admin" (you'll need to add this feature or do it via SQL)
   - Check Custody Log - a new "received" entry should appear automatically

---

## Troubleshooting

### "Trigger already exists" error
If you see this error, it means the trigger was already created. The script handles this by dropping the old trigger first, so this shouldn't happen. If it does, you can manually drop it:
```sql
DROP TRIGGER IF EXISTS auto_custody_log_trigger ON items;
```
Then run the script again.

### "Function already exists" error
The script uses `CREATE OR REPLACE FUNCTION`, so this shouldn't happen. If it does:
```sql
DROP FUNCTION IF EXISTS auto_log_custody_change() CASCADE;
```
Then run the script again.

### No entries created in backfill
This means you don't have any items with status `at_admin` yet. That's okay - the trigger will work for future status changes.

---

## Next Steps

After this is working, you might want to add a feature in the Admin Items page to manually change item status, which will automatically trigger custody log entries.
