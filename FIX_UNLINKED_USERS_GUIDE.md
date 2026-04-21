# Fix Unlinked Users Guide

## Problem

Users are showing as "Unlinked" in the Admin Users page. This means they have auth accounts but aren't connected to student records in the `students` table.

## Why This Happens

1. **RLS Policy Issue** - The original code tried to update the `students` table directly, but RLS policies prevent regular users from doing this
2. **Old Accounts** - Users who signed up before the linking system was properly configured
3. **Failed Updates** - The linking update failed silently during signup

## Solution

### Step 1: Run the Database Fix (Required)

Run this SQL in Supabase SQL Editor:

```sql
-- File: database/fix-student-linking.sql
```

This creates:
1. A secure function `link_student_account()` that users can call during signup
2. An RLS policy that allows users to link their own student record

### Step 2: Fix Existing Unlinked Users

#### Option A: Automatic Linking (Recommended)

Run this in Supabase SQL Editor to see unlinked users:

```sql
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'student_id' as student_id,
  au.raw_user_meta_data->>'name' as name
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
WHERE s.id IS NULL;
```

Then automatically link them:

```sql
UPDATE students s
SET 
  auth_user_id = au.id,
  email = COALESCE(s.email, au.email),
  full_name = COALESCE(s.full_name, au.raw_user_meta_data->>'name'),
  program = COALESCE(s.program, au.raw_user_meta_data->>'program'),
  year_level = COALESCE(s.year_level, au.raw_user_meta_data->>'year_level'),
  section = COALESCE(s.section, au.raw_user_meta_data->>'section'),
  updated_at = NOW()
FROM auth.users au
WHERE s.student_id = au.raw_user_meta_data->>'student_id'
  AND s.auth_user_id IS NULL
  AND s.status = 'active'
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL;
```

#### Option B: Manual Linking

For specific users, run:

```sql
UPDATE students
SET 
  auth_user_id = 'paste-auth-user-id-here',
  email = 'user@example.com',
  updated_at = NOW()
WHERE student_id = 'paste-student-id-here'
  AND auth_user_id IS NULL;
```

#### Option C: Create Student Records (If Needed)

If users signed up without being in the students table:

```sql
INSERT INTO students (
  student_id,
  full_name,
  email,
  program,
  year_level,
  section,
  status,
  auth_user_id
)
SELECT 
  COALESCE(au.raw_user_meta_data->>'student_id', 'TEMP-' || au.id::text),
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'program', 'Unknown'),
  COALESCE(au.raw_user_meta_data->>'year_level', 'Unknown'),
  au.raw_user_meta_data->>'section',
  'active',
  au.id
FROM auth.users au
LEFT JOIN students s ON s.auth_user_id = au.id
WHERE s.id IS NULL;
```

### Step 3: Verify the Fix

After running the SQL, refresh the Admin Users page. You should see:
- Fewer or no "Unlinked" users
- Users showing as "Linked" with green badges
- Proper student information displayed

## What Changed in the Code

### Before (Broken)
```javascript
// This failed because of RLS policies
await supabase
  .from('students')
  .update({ auth_user_id: data.user.id, ... })
  .eq('student_id', studentId);
```

### After (Fixed)
```javascript
// Uses a secure database function with SECURITY DEFINER
await supabase.rpc('link_student_account', {
  p_student_id: studentId.trim(),
  p_auth_user_id: data.user.id,
  p_email: email.trim(),
  // ... other params
});
```

## Testing

1. Try signing up a new user
2. Check the Admin Users page
3. New user should show as "Linked" immediately
4. Student record should have all the correct information

## Troubleshooting

### Users still showing as unlinked after running SQL

**Check if the function was created:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'link_student_account';
```

**Check if the policy exists:**
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'students' 
  AND policyname = 'Users can link their own student record';
```

### New signups still not linking

1. Check browser console for errors
2. Verify the function is being called (check Supabase logs)
3. Make sure the student ID exists in the students table
4. Verify the student record isn't already linked to another account

### Users have no student_id in metadata

This means they signed up before the metadata was being saved. You'll need to:
1. Ask them for their student ID
2. Manually link them using Option B above

## Prevention

Going forward, all new signups will automatically link correctly because:
1. The secure function bypasses RLS restrictions
2. The code now checks for errors and alerts the user
3. The RLS policy allows self-linking during signup

## Files Changed

- `app/auth.js` - Updated to use `link_student_account()` function
- `app/admin/users.js` - Now shows all auth users with link status
- `database/fix-student-linking.sql` - Database function and policy
- `database/fix-existing-unlinked-users.sql` - Scripts to fix existing users

## Summary

1. Run `database/fix-student-linking.sql` in Supabase
2. Run the appropriate query from `database/fix-existing-unlinked-users.sql`
3. Refresh the Admin Users page
4. All users should now be linked!
