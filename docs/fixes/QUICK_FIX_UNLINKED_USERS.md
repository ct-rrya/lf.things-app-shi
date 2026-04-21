# Quick Fix: Unlinked Users

## TL;DR - 3 Steps to Fix

### 1. Run Migration Script
```sql
-- In Supabase SQL Editor, run:
-- database/RESTRUCTURE_DATABASE.sql
```

### 2. Link Existing Users
```sql
-- Auto-link users based on metadata
UPDATE students s
SET auth_user_id = au.id
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;
```

### 3. Verify
```sql
-- Check results
SELECT 
  COUNT(*) as total,
  COUNT(auth_user_id) as linked,
  COUNT(*) - COUNT(auth_user_id) as unlinked
FROM students;
```

## What Changed?

**Old Structure:**
```
students: id (PK) → student_id (unique) → auth_user_id (FK)
items: id (PK) → user_id (FK to auth.users)
```

**New Structure:**
```
students: student_id (PK) → auth_user_id (UNIQUE FK)
items: id (PK) → student_id (FK to students)
```

## Why Users Were Unlinked

The signup code tried to UPDATE the students table, but RLS policies blocked it. The new structure:
- Uses `student_id` as the primary key
- Has a secure function to link accounts
- Enforces one student = one account

## Manual Linking

If auto-link doesn't work:

```sql
-- Find unlinked students
SELECT student_id, full_name, email 
FROM students 
WHERE auth_user_id IS NULL;

-- Find auth users without students
SELECT id, email, raw_user_meta_data->>'student_id'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM students WHERE auth_user_id = au.id
);

-- Link manually (replace values)
UPDATE students
SET auth_user_id = 'paste-auth-uuid-here'
WHERE student_id = 'paste-student-id-here';
```

## Test After Fix

1. Refresh Admin → Users page
2. All users should show "Linked" (green badge)
3. Try signing up a new user
4. New user should be linked immediately

## Files to Review

- `database/RESTRUCTURE_DATABASE.sql` - Full migration
- `DATABASE_MIGRATION_GUIDE.md` - Detailed guide
- `app/auth.js` - Updated signup code
- `app/admin/users.js` - Updated admin page

---

**Need help?** See `DATABASE_MIGRATION_GUIDE.md` for full details.
