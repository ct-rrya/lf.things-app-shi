# Contact Info Storage Fix - Complete Guide

## Problem
The item registration form was trying to insert `address` and `social_media` fields directly into the `items` table, but these columns don't exist. This caused the error:
```
Error: Could not find the 'address' column of 'items' in the schema cache
```

## Root Cause
Contact information (address, social_media, contact_phone) is **user-specific**, not **item-specific**. It should be stored in the user's profile, not duplicated for every item they register.

## Solution Architecture

### Data Storage Strategy
```
┌─────────────────────────────────────────────────────────────┐
│ BEFORE (WRONG)                                              │
├─────────────────────────────────────────────────────────────┤
│ items table:                                                │
│   - owner_name                                              │
│   - program                                                 │
│   - year_section                                            │
│   - contact_phone  ❌ Duplicated per item                   │
│   - address        ❌ Duplicated per item                   │
│   - social_media   ❌ Duplicated per item                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AFTER (CORRECT)                                             │
├─────────────────────────────────────────────────────────────┤
│ users table:                                                │
│   - contact_phone  ✅ Stored once per user                  │
│   - address        ✅ Stored once per user                  │
│   - social_media   ✅ Stored once per user                  │
│                                                             │
│ items table:                                                │
│   - user_id (foreign key)                                   │
│   - student_id (foreign key)                                │
│   - metadata (JSONB) → stores owner snapshot:               │
│     {                                                       │
│       "owner_name": "John Doe",                             │
│       "program": "BSCS",                                    │
│       "year_section": "3rd Year – Section A"                │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Database Migration

Run this SQL to add contact fields to users table:

```sql
-- File: database/add-user-contact-fields.sql

-- Add contact fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS social_media TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Remove from items table (if they exist)
ALTER TABLE items 
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS social_media,
DROP COLUMN IF EXISTS contact_phone;
```

### 2. Updated Registration Flow

#### Step 1: Fetch User Profile (with saved contact info)
```javascript
// Fetch from users table (not profiles)
const { data: userProfile } = await supabase
  .from('users')
  .select('id, student_id, email, contact_phone, address, social_media')
  .eq('id', user.id)
  .single();

// Fetch student data
const { data: student } = await supabase
  .from('students')
  .select('first_name, last_name, program, year_level, section')
  .eq('student_id', userProfile.student_id)
  .single();

// Combine and pre-fill form
setContactPhone(userProfile.contact_phone || '');
setAddress(userProfile.address || '');
setSocialMedia(userProfile.social_media || '');
```

#### Step 2: Save Contact Info to User Profile
```javascript
// Update user's contact info (if provided)
if (contactPhone.trim() || address.trim() || socialMedia.trim()) {
  await supabase
    .from('users')
    .update({
      contact_phone: contactPhone.trim() || null,
      address: address.trim() || null,
      social_media: socialMedia.trim() || null,
    })
    .eq('id', userProfile.id);
}
```

#### Step 3: Register Item (WITHOUT contact fields)
```javascript
const itemData = {
  user_id: userProfile.id,
  student_id: userProfile.student_id,
  name: name.trim(),
  category: category.id,
  description: description.trim() || null,
  photo_urls: photoUrls,
  status: 'safe',
  qr_code: `LF-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  // Store owner info as snapshot in metadata
  metadata: {
    owner_name: userProfile.full_name,
    program: userProfile.program,
    year_section: userProfile.year_section,
    registered_at: new Date().toISOString(),
  }
};

// Insert item (no contact fields here!)
const { data: insertedItem } = await supabase
  .from('items')
  .insert([itemData])
  .select()
  .single();
```

## Benefits of This Approach

### 1. No Data Duplication
- Contact info stored once per user, not per item
- User updates their address → all their items reflect the change

### 2. Consistent Data
- User's contact info is always up-to-date
- No need to update every item when contact info changes

### 3. Better UX
- Contact fields pre-fill with saved values
- User doesn't re-enter same info for each item
- Faster registration process

### 4. Cleaner Database
- Items table only stores item-specific data
- Users table stores user-specific data
- Clear separation of concerns

## How QR Code Contact Info Works

When someone scans a QR code:

1. **Fetch item data** from `items` table
2. **Fetch owner contact info** from `users` table via `user_id`
3. **Display combined information**:
   - Item details (from items table)
   - Owner name, program, year (from metadata snapshot)
   - Contact phone, address, social media (from users table - always current)

```javascript
// Example: Fetching item with owner contact info
const { data: item } = await supabase
  .from('items')
  .select(`
    *,
    owner:users!user_id (
      contact_phone,
      address,
      social_media
    )
  `)
  .eq('id', itemId)
  .single();

// Display
console.log('Item:', item.name);
console.log('Owner:', item.metadata.owner_name);
console.log('Contact:', item.owner.contact_phone);
console.log('Address:', item.owner.address);
```

## Updated Database Schema

### users table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    student_id TEXT REFERENCES students(student_id),
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student',
    
    -- Contact fields (NEW)
    contact_phone TEXT,
    address TEXT,
    social_media TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### items table
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    student_id TEXT REFERENCES students(student_id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    photo_urls TEXT[],
    status TEXT DEFAULT 'safe',
    qr_code TEXT UNIQUE NOT NULL,
    
    -- Owner info snapshot (JSONB)
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing Checklist

- [x] Run database migration to add contact fields to users table
- [x] Remove contact fields from items table (if they exist)
- [x] Update fetchUserProfile to fetch from users table
- [x] Pre-fill contact fields with saved values
- [x] Save contact info to users table on registration
- [x] Remove contact fields from item insert
- [x] Store owner info in metadata JSONB field
- [x] Test registration flow end-to-end
- [x] Verify contact info persists across registrations
- [x] Test QR code scanning displays correct contact info

## Migration Steps for Existing Data

If you have existing items with contact info in the items table:

```sql
-- 1. Migrate existing contact info to users table
UPDATE users u
SET 
  contact_phone = COALESCE(u.contact_phone, i.contact_phone),
  address = COALESCE(u.address, i.address),
  social_media = COALESCE(u.social_media, i.social_media)
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    contact_phone, 
    address, 
    social_media
  FROM items
  WHERE contact_phone IS NOT NULL 
     OR address IS NOT NULL 
     OR social_media IS NOT NULL
  ORDER BY user_id, created_at DESC
) i
WHERE u.id = i.user_id;

-- 2. Then drop the columns from items
ALTER TABLE items 
DROP COLUMN IF EXISTS contact_phone,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS social_media;
```

## Files Modified

1. **database/add-user-contact-fields.sql** - Database migration
2. **app/(tabs)/register.js** - Updated registration form:
   - `fetchUserProfile()` - Fetch from users table with contact fields
   - `handleRegister()` - Save contact to users, remove from items insert

## Summary

Contact information is now properly stored in the users table where it belongs, not duplicated in every item record. This provides a cleaner database structure, better user experience, and eliminates the schema error.

---

**Status**: ✅ COMPLETE
**Date**: 2026-04-21
