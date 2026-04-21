## Database Restructure Migration Guide

This guide will help you migrate your database to use `student_id` as the primary key instead of UUID.

## Why This Change?

**Before (Problem):**
- Students table used UUID as primary key
- `student_id` was just a unique field
- `auth_user_id` linked to auth.users
- Confusing relationships and linking issues

**After (Solution):**
- `student_id` is the PRIMARY KEY (e.g., "21-12345")
- Everything links to student_id
- Cleaner, more intuitive data model
- Student ID is the source of truth

## Prerequisites

1. **BACKUP YOUR DATABASE FIRST!**
   - Go to Supabase Dashboard → Database → Backups
   - Create a manual backup before proceeding

2. **Export your data** (optional but recommended):
   ```sql
   -- Export students
   COPY students TO '/tmp/students_backup.csv' CSV HEADER;
   
   -- Export items
   COPY items TO '/tmp/items_backup.csv' CSV HEADER;
   ```

## Migration Steps

### Step 1: Run the Restructure Script

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the entire contents of `database/RESTRUCTURE_DATABASE.sql`
4. **Review the script carefully**
5. Run the script

The script will:
- Create a new students table with `student_id` as primary key
- Migrate all existing data
- Update foreign keys in items table
- Create helper functions and views
- Update RLS policies

### Step 2: Verify the Migration

Run these verification queries:

```sql
-- Check students table structure
SELECT 
  COUNT(*) as total_students,
  COUNT(auth_user_id) as linked_students,
  COUNT(*) - COUNT(auth_user_id) as unlinked_students
FROM students;

-- Check if student_id is primary key
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'students' 
  AND constraint_type = 'PRIMARY KEY';

-- Check items table
SELECT 
  COUNT(*) as total_items,
  COUNT(student_id) as items_with_student_id
FROM items;

-- Check for any orphaned items
SELECT i.id, i.name, i.student_id
FROM items i
LEFT JOIN students s ON s.student_id = i.student_id
WHERE s.student_id IS NULL
LIMIT 10;
```

### Step 3: Test the Application

1. **Test Sign Up:**
   - Try creating a new account
   - Verify it links to the student record
   - Check Admin Users page shows "Linked"

2. **Test Sign In:**
   - Sign in with an existing account
   - Verify you can access your items
   - Check profile shows correct student info

3. **Test Item Registration:**
   - Register a new item
   - Verify it's linked to your student_id
   - Check it appears in "My Items"

4. **Test Admin Functions:**
   - Go to Admin → Users
   - Verify all users show up
   - Check linked/unlinked status
   - Try viewing student details

### Step 4: Update Application Code (Already Done)

The following files have been updated:
- ✅ `app/auth.js` - Uses new linking function
- ✅ `app/admin/users.js` - Works with new structure
- ✅ `database/RESTRUCTURE_DATABASE.sql` - Migration script

### Step 5: Fix Any Unlinked Users

If you still have unlinked users after migration:

```sql
-- See unlinked students
SELECT student_id, full_name, email, status
FROM students
WHERE auth_user_id IS NULL
ORDER BY student_id;

-- See auth users without student records
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'student_id' as claimed_student_id
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
WHERE s.student_id IS NULL;

-- Link a specific user (replace values)
UPDATE students
SET auth_user_id = 'AUTH_USER_ID_HERE'
WHERE student_id = 'STUDENT_ID_HERE'
  AND auth_user_id IS NULL;
```

### Step 6: Cleanup (After Verification)

Once everything is working:

```sql
-- Drop the old backup table
DROP TABLE IF EXISTS students_old;

-- Optionally remove old user_id column from items
-- (Keep it for a while as backup)
-- ALTER TABLE items DROP COLUMN IF EXISTS user_id;
```

## New Database Structure

### Students Table (Primary)
```
student_id (PK)  | full_name | email (UNIQUE) | program | year_level | section | status | auth_user_id (UNIQUE FK)
21-12345         | Juan Cruz | juan@email.com | BSIT    | 3          | A       | active | uuid-here
```

### Items Table
```
id (PK) | student_id (FK) | name      | category | status | qr_token
uuid    | 21-12345        | Laptop    | Laptop   | safe   | uuid
```

### Key Relationships
- `students.student_id` → PRIMARY KEY
- `students.auth_user_id` → UNIQUE, references `auth.users(id)`
- `items.student_id` → references `students.student_id)`

## Helper Functions Available

```sql
-- Get student_id from auth_user_id
SELECT get_student_id(auth.uid());

-- Get auth_user_id from student_id
SELECT get_auth_user_id('21-12345');

-- Link a student account (used during signup)
SELECT link_student_account(
  '21-12345',           -- student_id
  'auth-uuid-here',     -- auth_user_id
  'email@example.com',  -- email
  'Full Name',          -- full_name
  'BSIT',              -- program
  '3',                 -- year_level
  'A'                  -- section
);
```

## Helper Views Available

```sql
-- Get user profiles (combines students + auth)
SELECT * FROM user_profiles;

-- Get items with student info
SELECT * FROM items_with_student_info;
```

## Troubleshooting

### Issue: Migration fails with foreign key error

**Solution:** Some items might reference non-existent student_ids
```sql
-- Find problematic items
SELECT i.* 
FROM items i
LEFT JOIN students_old s ON s.auth_user_id = i.user_id
WHERE s.id IS NULL;

-- Fix by deleting or updating them
DELETE FROM items WHERE user_id NOT IN (SELECT auth_user_id FROM students_old);
```

### Issue: Users still showing as unlinked

**Solution:** Check if auth_user_id is set
```sql
-- Check specific student
SELECT * FROM students WHERE student_id = 'YOUR-STUDENT-ID';

-- Manually link if needed
UPDATE students 
SET auth_user_id = 'AUTH-USER-ID-HERE'
WHERE student_id = 'STUDENT-ID-HERE';
```

### Issue: Can't sign up new users

**Solution:** Check if link_student_account function exists
```sql
-- Verify function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'link_student_account';

-- If not, run the function creation part of RESTRUCTURE_DATABASE.sql
```

### Issue: Items not showing up

**Solution:** Items might not have student_id set
```sql
-- Check items
SELECT id, name, user_id, student_id FROM items LIMIT 10;

-- Populate student_id from user_id
UPDATE items i
SET student_id = s.student_id
FROM students s
WHERE i.user_id = s.auth_user_id
  AND i.student_id IS NULL;
```

## Benefits of New Structure

1. **Clearer Data Model** - Student ID is the natural identifier
2. **Better Integrity** - One student = one account (enforced by UNIQUE)
3. **Easier Queries** - No need to join through auth.users
4. **Simpler Code** - Less confusion about which ID to use
5. **Better Performance** - Direct lookups by student_id

## Rollback Plan

If something goes wrong:

1. The old table is saved as `students_old`
2. Restore from Supabase backup
3. Or manually restore:

```sql
-- Restore old table
DROP TABLE students;
ALTER TABLE students_old RENAME TO students;

-- Restore old policies (run admin-schema.sql)
```

## Next Steps

After successful migration:

1. Monitor for any issues
2. Update any custom queries in your code
3. Update documentation
4. Train team on new structure
5. After 1-2 weeks of stability, drop backup tables

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs for errors
3. Check browser console for client-side errors
4. Verify RLS policies are working correctly

---

**Remember: Always backup before running migrations!**
