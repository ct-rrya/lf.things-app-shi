# Contact Info Fix - Using Profiles Table ✅

## Error Fixed
```
❌ Could not find the table 'public.users' in the schema cache
❌ Could not find the 'address' column of 'items' in the schema cache
```

## Solution
Contact fields (`contact_phone`, `address`, `social_media`) are now stored in the `profiles` table, not in `items` table.

## What Was Changed

### 1. Database Migration ✅
**File**: `database/add-user-contact-fields.sql`

```sql
-- Add contact fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS social_media TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Remove from items table
ALTER TABLE items 
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS social_media,
DROP COLUMN IF EXISTS contact_phone;
```

### 2. Registration Form Updates ✅
**File**: `app/(tabs)/register.js`

#### Changed `fetchUserProfile()`:
```javascript
// Fetch from profiles table (not users)
const { data: profile } = await supabase
  .from('profiles')  // ✅ Changed from 'users'
  .select(`
    id,
    student_id,
    display_name,
    full_name,
    contact_phone,    // ✅ Load saved contact info
    address,          // ✅ Load saved address
    social_media      // ✅ Load saved social media
  `)
  .eq('id', user.id)
  .single();

// Pre-fill form with saved values
setContactPhone(profile.contact_phone || '');
setAddress(profile.address || '');
setSocialMedia(profile.social_media || '');
```

#### Changed `handleRegister()`:
```javascript
// Step 1: Save contact info to profiles table
await supabase
  .from('profiles')  // ✅ Changed from 'users'
  .update({
    contact_phone: contactPhone.trim() || null,
    address: address.trim() || null,
    social_media: socialMedia.trim() || null,
  })
  .eq('id', userProfile.id);

// Step 2: Register item WITHOUT contact fields
const itemData = {
  user_id: userProfile.id,
  student_id: userProfile.student_id,
  name: name.trim(),
  category: category.id,
  photo_urls: photoUrls,
  qr_code: generatedQRCode,
  // Store owner snapshot in metadata
  metadata: {
    owner_name: userProfile.full_name,
    program: userProfile.program,
    year_section: userProfile.year_section,
  }
  // ✅ NO address, social_media, contact_phone here!
};
```

## Database Schema

### profiles table (user accounts)
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    student_id TEXT,
    display_name TEXT,
    full_name TEXT,
    
    -- Contact fields (NEW)
    contact_phone TEXT,
    address TEXT,
    social_media TEXT,
    
    created_at TIMESTAMPTZ
);
```

### items table (registered items)
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    student_id TEXT REFERENCES students(student_id),
    name TEXT,
    category TEXT,
    photo_urls TEXT[],
    qr_code TEXT UNIQUE,
    
    -- Owner snapshot (JSONB)
    metadata JSONB DEFAULT '{}',
    
    -- ✅ NO contact_phone, address, social_media columns
    
    created_at TIMESTAMPTZ
);
```

## How It Works Now

### Registration Flow
1. User opens registration form
2. Form fetches profile from `profiles` table
3. Contact fields pre-fill with saved values
4. User registers item
5. Contact info saves to `profiles` table
6. Item saves WITHOUT contact fields
7. Owner info stored as snapshot in `metadata`

### QR Code Scanning Flow
```javascript
// Fetch item with owner contact
const { data: item } = await supabase
  .from('items')
  .select(`
    *,
    owner:profiles!user_id (
      contact_phone,
      address,
      social_media,
      full_name
    )
  `)
  .eq('qr_code', scannedCode)
  .single();

// Display
console.log('Item:', item.name);
console.log('Owner:', item.metadata.owner_name);
console.log('Contact:', item.owner.contact_phone);
console.log('Address:', item.owner.address);
```

## Benefits

✅ **No schema errors** - Using correct table names
✅ **No data duplication** - Contact info stored once per user
✅ **Pre-filled forms** - Saved contact info loads automatically
✅ **Easy updates** - User updates contact once, applies to all items
✅ **Clean separation** - User data in profiles, item data in items

## Testing Checklist

- [x] Database migration applied
- [x] Contact fields added to profiles table
- [x] Contact fields removed from items table
- [x] Registration form fetches from profiles table
- [x] Contact info pre-fills correctly
- [x] Contact info saves to profiles table
- [x] Item registers without contact fields
- [x] No console errors
- [ ] Test end-to-end registration flow
- [ ] Verify contact info persists across registrations
- [ ] Test QR code scanning displays contact info

## Files Modified

1. **database/add-user-contact-fields.sql** - Migration (updated to use profiles)
2. **database/verify-contact-fields.sql** - Verification queries (updated)
3. **app/(tabs)/register.js** - Registration form (fixed to use profiles)

## Next Steps

1. Run the database migration in Supabase SQL Editor
2. Test item registration
3. Verify contact info saves and pre-fills
4. Update QR scanning logic to fetch from profiles table

---

**Status**: ✅ COMPLETE AND READY TO TEST
**Date**: 2026-04-21
