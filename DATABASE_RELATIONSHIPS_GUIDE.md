# Database Relationships Guide

## Overview
This guide explains how the `students` masterlist connects to `profiles` (active users) and `items` tables.

---

## Current Database Structure

### Primary Tables

#### 1. `students` (Masterlist)
- **Primary Key**: `student_id` (TEXT) - e.g., "21-12345"
- **Purpose**: Master list of all students at CTU Daanbantayan
- **Managed By**: Admin via CSV import or manual entry
- **Contains**: student_id, full_name, email, program, year_level, section, status, auth_user_id

#### 2. `profiles` (Active Users)
- **Primary Key**: `id` (UUID) - matches auth.users.id
- **Foreign Key**: `student_id` (TEXT) → `students.student_id`
- **Purpose**: User profiles for students who have signed up
- **Created When**: User signs up via the app
- **Contains**: id, display_name, student_id, program, year_level, section, bio, avatar_seed

#### 3. `items` (Registered Items)
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
  - `user_id` (UUID) → `auth.users.id`
  - `student_id` (TEXT) → `students.student_id`
- **Purpose**: Items registered by students with QR codes
- **Contains**: id, user_id, student_id, name, category, photo_urls, qr_token, status

---

## Relationships

### Relationship Diagram
```
┌─────────────────┐
│    students     │ ← Masterlist (managed by admin)
│  (student_id)   │
└────────┬────────┘
         │
         │ Referenced by (FK)
         │
    ┌────┴────┬──────────────┐
    │         │              │
    ▼         ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────┐
│profiles │ │  items   │ │  others  │
│         │ │          │ │          │
└─────────┘ └──────────┘ └──────────┘
Active Users  Registered   (future)
             Items
```

### 1. students → profiles (One-to-One)
```sql
profiles.student_id → students.student_id
```
- **Relationship**: One student can have one profile
- **Constraint**: Foreign Key with CASCADE UPDATE, SET NULL on DELETE
- **Purpose**: Links active users to masterlist
- **Example Query**:
```sql
SELECT p.*, s.full_name, s.program, s.year_level
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id;
```

### 2. students → items (One-to-Many)
```sql
items.student_id → students.student_id
```
- **Relationship**: One student can have many items
- **Constraint**: Foreign Key with CASCADE UPDATE, SET NULL on DELETE
- **Purpose**: Links registered items to masterlist
- **Example Query**:
```sql
SELECT i.*, s.full_name, s.program
FROM items i
LEFT JOIN students s ON i.student_id = s.student_id;
```

---

## Foreign Key Constraints

### What They Do

1. **Data Integrity**
   - Ensures `student_id` in profiles/items exists in students table
   - Prevents orphaned records

2. **Automatic Updates (CASCADE)**
   - If `student_id` changes in students table, it updates in profiles/items
   - Example: Changing "21-12345" to "21-54321" updates everywhere

3. **Safe Deletion (SET NULL)**
   - If student is deleted, `student_id` in profiles/items becomes NULL
   - Records are preserved but unlinked

### How to Add Constraints

Run these SQL scripts in Supabase SQL Editor:

1. **For profiles table**:
   ```bash
   database/add-profiles-student-fk.sql
   ```

2. **For items table**:
   ```bash
   database/add-items-student-fk.sql
   ```

---

## Sign-Up Flow (How They Connect)

### Step-by-Step Process

1. **Admin adds student to masterlist**
   ```sql
   INSERT INTO students (student_id, full_name, program, year_level, section, status)
   VALUES ('21-12345', 'Juan Dela Cruz', 'BSCS', '3rd Year', 'A', 'active');
   ```

2. **Student signs up via app**
   - Enters: student_id, full_name, email, program, year_level, section, password
   - App verifies student_id exists in students table
   - Creates auth account

3. **Link student account (automatic)**
   ```sql
   -- Updates students table
   UPDATE students 
   SET auth_user_id = '<new_user_uuid>', email = 'juan@email.com'
   WHERE student_id = '21-12345';
   
   -- Creates profile
   INSERT INTO profiles (id, student_id, display_name, program, year_level, section)
   VALUES ('<new_user_uuid>', '21-12345', 'Juan Dela Cruz', 'BSCS', '3rd Year', 'A');
   ```

4. **Student registers item**
   ```sql
   INSERT INTO items (user_id, student_id, name, category, ...)
   VALUES ('<user_uuid>', '21-12345', 'Blue Backpack', 'bag', ...);
   ```

---

## Queries

### Get all active users with student info
```sql
SELECT 
  p.id as auth_user_id,
  p.display_name,
  p.student_id,
  s.full_name as masterlist_name,
  s.program,
  s.year_level,
  s.section,
  s.status,
  s.email
FROM profiles p
LEFT JOIN students s ON p.student_id = s.student_id
ORDER BY p.created_at DESC;
```

### Get all items with owner info
```sql
SELECT 
  i.id,
  i.name as item_name,
  i.category,
  i.status,
  s.student_id,
  s.full_name as owner_name,
  s.program,
  s.year_level,
  s.section
FROM items i
LEFT JOIN students s ON i.student_id = s.student_id
ORDER BY i.created_at DESC;
```

### Find unlinked students (in masterlist but no account)
```sql
SELECT 
  student_id,
  full_name,
  program,
  year_level,
  section,
  status
FROM students
WHERE auth_user_id IS NULL
  AND status = 'active'
ORDER BY student_id;
```

### Find orphaned profiles (profile without valid student_id)
```sql
SELECT 
  p.id,
  p.student_id,
  p.display_name
FROM profiles p
WHERE p.student_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.student_id = p.student_id
  );
```

---

## Benefits of Foreign Keys

### 1. Data Integrity
- ✅ Cannot create profile with invalid student_id
- ✅ Cannot create item with invalid student_id
- ✅ Prevents typos and data corruption

### 2. Automatic Maintenance
- ✅ Update student_id once, changes everywhere
- ✅ Delete student safely (sets NULL in related tables)
- ✅ No manual cleanup needed

### 3. Better Performance
- ✅ Indexes on foreign keys speed up JOINs
- ✅ Database can optimize queries better
- ✅ Faster lookups and reports

### 4. Clearer Relationships
- ✅ Database schema documents relationships
- ✅ Easier for new developers to understand
- ✅ Self-documenting data model

---

## Migration Steps

### If you haven't added foreign keys yet:

1. **Backup your data** (export from Supabase)

2. **Run profiles foreign key script**
   ```sql
   -- In Supabase SQL Editor
   -- Copy and run: database/add-profiles-student-fk.sql
   ```

3. **Run items foreign key script**
   ```sql
   -- In Supabase SQL Editor
   -- Copy and run: database/add-items-student-fk.sql
   ```

4. **Verify constraints**
   ```sql
   SELECT 
     constraint_name,
     table_name,
     column_name
   FROM information_schema.key_column_usage
   WHERE constraint_name IN ('fk_profiles_student_id', 'fk_items_student_id');
   ```

5. **Test queries** (see Queries section above)

---

## Troubleshooting

### Error: "violates foreign key constraint"

**Cause**: Trying to insert a record with student_id that doesn't exist in students table

**Solution**: 
1. Check if student exists: `SELECT * FROM students WHERE student_id = '21-12345';`
2. If not, add student to masterlist first
3. Then create profile/item

### Error: "cannot drop table students because other objects depend on it"

**Cause**: Foreign key constraints prevent dropping the table

**Solution**:
1. Drop constraints first: `ALTER TABLE profiles DROP CONSTRAINT fk_profiles_student_id;`
2. Or use CASCADE: `DROP TABLE students CASCADE;` (⚠️ dangerous!)

### Orphaned records after migration

**Cause**: Existing records with invalid student_ids

**Solution**:
```sql
-- Find orphaned profiles
SELECT * FROM profiles 
WHERE student_id IS NOT NULL 
  AND student_id NOT IN (SELECT student_id FROM students);

-- Fix by setting to NULL or adding missing students
UPDATE profiles SET student_id = NULL WHERE student_id = 'invalid-id';
```

---

## Summary

The database now has proper relationships:
- ✅ `profiles.student_id` → `students.student_id` (Foreign Key)
- ✅ `items.student_id` → `students.student_id` (Foreign Key)
- ✅ Data integrity enforced at database level
- ✅ Automatic updates and safe deletions
- ✅ Better query performance with indexes

All active users (profiles) and registered items are now properly connected to the students masterlist!
