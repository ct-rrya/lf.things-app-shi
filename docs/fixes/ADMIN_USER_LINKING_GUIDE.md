# Admin User Linking Guide

## Overview

This guide explains how the admin panel manages the relationship between the **students** table (masterlist) and **profiles** table (signed-up users).

## Understanding the Tables

### Students Table (Masterlist)
- Pre-populated by admin
- Contains ALL students (whether they've signed up or not)
- Fields: `student_id`, `full_name`, `email`, `program`, `year_level`, `section`, `status`, `auth_user_id`
- The `auth_user_id` field links to the auth user when a student signs up

### Profiles Table (Signed-Up Users)
- Created when a student signs up
- Only contains students who have created accounts
- Fields: `id` (auth user ID), `student_id`, `full_name`, `display_name`, etc.
- The `student_id` field should link back to the students table

## How Linking Works

The system uses **multiple strategies** to link profiles to students:

### Strategy 1: Match by student_id
```sql
profiles.student_id = students.student_id
```
This is the primary linking method when the profile has a student_id.

### Strategy 2: Match by email
```sql
profiles.full_name = students.email
```
The `profiles.full_name` field often stores the email address, so we match it against the student's email.

### Strategy 3: Match by auth email
```sql
auth.users.email = students.email
```
We get the email from the auth system and match it to the student's email.

### Strategy 4: Match by auth_user_id
```sql
profiles.id = students.auth_user_id
```
If the student record has been updated with the auth_user_id, we use that.

## Admin Panel Features

### Students Tab
Shows the complete masterlist of students with:
- ✓ icon next to email if the student has signed up (has `auth_user_id`)
- All student information from the masterlist
- Status (active, inactive, graduated)
- Ability to add/import students

### Users Tab
Shows only students who have signed up with:
- Student ID (shows "Not Linked" if no student record found)
- Full Name (from student record if linked, otherwise from profile)
- Program, Year, Section (from student record if linked)
- Email (from auth system)
- ✓ icon next to name if successfully linked to student record
- Orange text for "Not Linked" student IDs

### Detail Panel
When you click on a user, you see:
- Complete user information
- Link Status (green ✓ if linked, orange warning if not)
- Success box showing which student they're linked to (if linked)
- Warning box explaining the issue (if not linked)

## Fixing Linking Issues

### Quick Fix (Recommended)

Open Supabase SQL Editor and run `database/fix-profiles-students-simple.sql`:

```sql
-- This links profiles to students by matching emails
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE LOWER(profiles.full_name) = LOWER(students.email)
  AND profiles.student_id IS NULL
  AND students.email IS NOT NULL;
```

This is the safest option that doesn't modify your students table structure.

### Full Fix (If You Want Bidirectional Linking)

If your students table has an `auth_user_id` column (or you want to add it), run `database/fix-profiles-students-linking-safe.sql`:

```sql
-- Step 1: Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE students 
        ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 2: Link profiles to students
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE LOWER(profiles.full_name) = LOWER(students.email)
  AND profiles.student_id IS NULL;

-- Step 3: Link students to auth users
UPDATE students 
SET auth_user_id = profiles.id
FROM profiles 
WHERE LOWER(students.email) = LOWER(profiles.full_name)
  AND students.auth_user_id IS NULL;
```

### Step 2: Use the "Sync Users" Button

In the Users tab, click the "Sync Users" button. This will:
1. Find all students without `auth_user_id`
2. Match them to auth users by email
3. Update the `auth_user_id` field
4. Show you how many were successfully linked

### Step 3: Manual Verification

After syncing, check the verification queries in the SQL script:

```sql
-- See linking status
SELECT 
  'Total Profiles' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Profiles Linked to Students',
  COUNT(*)
FROM profiles
WHERE student_id IS NOT NULL;
```

## Common Issues and Solutions

### Issue 1: User shows "Not Linked" but student exists

**Cause**: Email mismatch between profile and student record

**Solution**:
1. Check the student's email in the Students tab
2. Check the user's email in the Users tab
3. If they don't match, update the student's email in the database:
```sql
UPDATE students 
SET email = 'correct@email.com'
WHERE student_id = '2021-12345';
```
4. Run the linking script again

### Issue 2: Student has ✓ but user shows "Not Linked"

**Cause**: The `auth_user_id` is set in students but `student_id` is missing in profiles

**Solution**:
```sql
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE profiles.id = students.auth_user_id 
  AND profiles.student_id IS NULL;
```

### Issue 3: Multiple users with same email

**Cause**: Duplicate accounts or test accounts

**Solution**:
1. Identify duplicates:
```sql
SELECT email, COUNT(*) 
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1;
```
2. Delete test/duplicate accounts through Supabase Dashboard → Authentication → Users

### Issue 4: User signed up but not in masterlist

**Cause**: Student signed up before being added to masterlist

**Solution**:
1. Add the student to the masterlist in the Students tab
2. Make sure the email matches exactly
3. Click "Sync Users" to link them

## Best Practices

### For Adding New Students
1. Always add students to the masterlist BEFORE they sign up
2. Use the correct email format (the one they'll use to sign up)
3. Use the CSV import feature for bulk additions
4. Verify the import was successful

### For Managing Existing Users
1. Run the linking script after bulk imports
2. Use "Sync Users" button regularly to catch any unlinked accounts
3. Check the Users tab for any "Not Linked" entries
4. Investigate and fix linking issues promptly

### For Data Integrity
1. Never delete students from the masterlist if they have signed up
2. Use "inactive" status instead of deleting
3. Keep emails consistent between systems
4. Run verification queries periodically

## Verification Checklist

Run these queries to verify everything is working:

### 1. Check Total Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM students) as total_students,
  (SELECT COUNT(*) FROM students WHERE auth_user_id IS NOT NULL) as students_with_accounts,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE student_id IS NOT NULL) as profiles_linked;
```

### 2. Find Unlinked Profiles
```sql
SELECT 
  p.id,
  p.full_name as email,
  p.student_id,
  p.display_name
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id
WHERE s.student_id IS NULL;
```

### 3. Find Students Without Accounts
```sql
SELECT 
  student_id,
  full_name,
  email,
  program,
  year_level
FROM students
WHERE auth_user_id IS NULL
  AND status = 'active'
ORDER BY full_name;
```

### 4. Verify Linking Accuracy
```sql
SELECT 
  p.id as auth_id,
  p.full_name as profile_email,
  p.student_id as profile_student_id,
  s.student_id as student_student_id,
  s.full_name as student_name,
  s.email as student_email,
  CASE 
    WHEN p.student_id IS NOT NULL AND s.student_id IS NOT NULL THEN 'Linked ✓'
    ELSE 'Unlinked'
  END as status
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id OR p.full_name = s.email
ORDER BY p.created_at DESC;
```

## Performance Optimization

The linking script creates these indexes for better performance:

```sql
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
```

These indexes speed up:
- Profile-to-student lookups
- Email matching
- Admin panel queries
- Sync operations

## Troubleshooting

### Admin Panel Shows Wrong Data

1. **Refresh the page** - Sometimes cached data needs to be cleared
2. **Check browser console** - Look for any JavaScript errors
3. **Verify database connection** - Make sure Supabase is accessible
4. **Check RLS policies** - Ensure admin has proper permissions

### Sync Button Not Working

1. **Check admin permissions** - User must have admin role
2. **Verify supabaseAdmin client** - Check `lib/supabaseAdmin.js` configuration
3. **Look at console errors** - Check for API errors
4. **Test SQL directly** - Run the linking queries manually in SQL Editor

### Data Inconsistencies

1. **Run all verification queries** - Identify the scope of the issue
2. **Check for NULL values** - Ensure required fields are populated
3. **Verify email formats** - Make sure emails are lowercase and valid
4. **Look for special characters** - Some characters can cause matching issues

## Migration to New Schema

If you're planning to migrate to the new redesigned schema (with `users` table instead of `profiles`):

1. **Backup current data** - Export profiles and students tables
2. **Run the redesign schema** - Execute `database/complete-redesign-schema.sql`
3. **Migrate data** - Use the migration scripts provided
4. **Update app code** - Switch to new `lib/authService.js`
5. **Test thoroughly** - Verify all linking works correctly

See `DATABASE_REDESIGN_GUIDE.md` for complete migration instructions.

## Support

If you encounter issues not covered in this guide:

1. Check Supabase logs in Dashboard → Logs
2. Review RLS policies in Dashboard → Authentication → Policies
3. Test queries in SQL Editor
4. Check browser console for client-side errors
5. Verify environment variables in `.env`
