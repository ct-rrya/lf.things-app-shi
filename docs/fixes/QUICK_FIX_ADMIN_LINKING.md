# Quick Fix: Admin Panel User Linking

## The Problem
Your admin Users tab shows "Not Linked" or "N/A" for student IDs because profiles aren't connected to the students masterlist.

## The Solution (2 Minutes)

### Step 1: Run This SQL Query

Open Supabase Dashboard → SQL Editor → New Query, then paste and run:

```sql
-- Link profiles to students by matching emails
UPDATE profiles 
SET student_id = students.student_id
FROM students 
WHERE LOWER(profiles.full_name) = LOWER(students.email)
  AND profiles.student_id IS NULL
  AND students.email IS NOT NULL;

-- Check results
SELECT 
  'Total Profiles' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Profiles Now Linked',
  COUNT(*)
FROM profiles
WHERE student_id IS NOT NULL;
```

### Step 2: Refresh Admin Panel

1. Go to your admin panel
2. Click on the Users tab
3. Refresh the page (F5 or Cmd+R)

### Step 3: Verify

You should now see:
- ✓ Proper student IDs (not "Not Linked")
- ✓ Correct programs, years, sections
- ✓ Green checkmark next to linked users
- ✓ Success box in detail panel

## If You Still See "Not Linked"

### Option A: Use the Sync Button
1. In the Users tab, click "Sync Users" button
2. Wait for confirmation message
3. Refresh the page

### Option B: Check for Email Mismatches

Run this query to find unlinked profiles:

```sql
SELECT 
  p.id,
  p.full_name as profile_email,
  p.student_id,
  'No matching student email' as issue
FROM profiles p
LEFT JOIN students s ON LOWER(p.full_name) = LOWER(s.email)
WHERE p.student_id IS NULL
  AND s.student_id IS NULL;
```

If you see results, the emails don't match. You need to either:
1. Update the student's email in the Students tab
2. Or manually link them with:

```sql
UPDATE profiles 
SET student_id = '2021-12345'  -- Replace with actual student_id
WHERE full_name = 'student@email.com';  -- Replace with actual email
```

## What This Does

The SQL query:
1. Looks at each profile (signed-up user)
2. Finds their email (stored in `profiles.full_name`)
3. Matches it to a student in the masterlist by email
4. Updates `profiles.student_id` with the matching student's ID

This allows the admin panel to show complete student information for each user.

## Files Reference

- **Simple fix**: `database/fix-profiles-students-simple.sql`
- **Full fix with auth_user_id**: `database/fix-profiles-students-linking-safe.sql`
- **Complete guide**: `ADMIN_USER_LINKING_GUIDE.md`
- **Summary**: `ADMIN_PANEL_FIX_SUMMARY.md`

## Troubleshooting

### Error: "column students.auth_user_id does not exist"
**Solution**: Use the simple fix above (it doesn't need that column)

### Still showing "Not Linked" after running SQL
**Solution**: 
1. Check that student emails match profile emails (case-insensitive)
2. Make sure students have email addresses in the masterlist
3. Use the Sync Users button in the admin panel

### Some users linked, some not
**Solution**: Run the verification query to see which ones failed and why

### Need to add auth_user_id column
**Solution**: Run this first:
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE 
REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_auth_user_id 
ON students(auth_user_id);
```

## Success Indicators

After the fix, you should see:

**In Students Tab:**
- ✓ icon next to emails of students who signed up

**In Users Tab:**
- Actual student IDs (e.g., "2021-12345") instead of "Not Linked"
- Correct program names (e.g., "BSIT", "BSCS")
- Correct year levels (e.g., "3rd Year")
- Correct sections (e.g., "A", "B")
- ✓ icon next to names of linked users

**In Detail Panel:**
- "Linked to Student ✓" status in green
- Success box showing which student they're linked to
- All fields populated with correct data

## Need More Help?

See the complete guides:
- `ADMIN_USER_LINKING_GUIDE.md` - Detailed explanation
- `ADMIN_PANEL_FIX_SUMMARY.md` - What was changed
- `database/admin-quick-fixes.sql` - More SQL commands
