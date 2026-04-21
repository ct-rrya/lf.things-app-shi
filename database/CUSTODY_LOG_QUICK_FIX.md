# ⚡ Quick Fix: Empty Custody Log

## Problem
Custody log is empty even though items have status `at_admin`.

## Solution (2 minutes)

### Optional: Check Current Status First
Run `database/check-custody-status.sql` to see:
- How many items are at admin
- How many custody entries exist
- The gap that needs to be filled

### Step 1: Open Supabase
Dashboard → **SQL Editor** → **New Query**

### Step 2: Run This Script
Open and copy: `database/auto-custody-log-trigger.sql`

Paste into SQL Editor and click **Run**

### Step 3: Done! ✓
Refresh your Admin → Custody Log page

---

## What You'll See

**Before:**
```
Custody Log
Items physically held at the admin office

[Empty - No custody records yet]
```

**After:**
```
Custody Log
Items physically held at the admin office

Item              Category    Action     Shelf  Notes                    Date
Blue Backpack     Bag         received   —      Backfilled - item was... 4/15/2026
Student ID        ID          received   —      Backfilled - item was... 4/18/2026
```

---

## How It Works

### Automatic (from now on):
- Item status → `at_admin` = Auto-creates "received" entry
- Item status → `safe` (from `at_admin`) = Auto-creates "returned" entry

### Backfill (one-time):
- Creates "received" entries for existing `at_admin` items

---

## Need Help?
See detailed guide: `database/RUN_THIS_CUSTODY_TRIGGER.md`
