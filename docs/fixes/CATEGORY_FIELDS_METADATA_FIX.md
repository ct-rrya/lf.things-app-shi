# Category Fields Metadata Fix ✅

## Error Fixed
```
❌ Could not find the 'holder_name' column of 'items' in the schema cache
```

## Root Cause
Category-specific fields (like `holder_name`, `id_type`, `brand`, `model`, etc.) were being spread directly into the `itemData` object with `...formData`, attempting to insert them as columns in the items table. However, the items table doesn't have individual columns for each category field.

## Solution
All category-specific fields are now stored in the `metadata` JSONB column instead of as separate table columns.

## What Changed

### Before (Wrong) ❌
```javascript
const itemData = {
  user_id: userProfile.id,
  name: name.trim(),
  category: category.id,
  ...formData,  // ❌ Tries to insert holder_name, brand, model as columns
  metadata: {
    owner_name: userProfile.full_name,
  }
};
```

This tried to insert fields like:
- `holder_name` (for ID category)
- `brand`, `model`, `color` (for laptop/phone)
- `key_type`, `keychain` (for keys)
- etc.

But these columns don't exist in the items table!

### After (Correct) ✅
```javascript
const itemData = {
  user_id: userProfile.id,
  student_id: userProfile.student_id,
  name: name.trim(),
  category: category.id,
  description: description.trim() || null,
  photo_urls: photoUrls,
  status: 'safe',
  qr_code: generatedQRCode,
  // ✅ ALL additional data goes in metadata JSONB
  metadata: {
    // Owner info
    owner_name: userProfile.full_name,
    program: userProfile.program,
    year_section: userProfile.year_section,
    registered_at: new Date().toISOString(),
    // Category-specific fields
    ...formData,  // ✅ Now stored in metadata, not as columns
  }
};
```

## Database Schema

### items table structure
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    student_id TEXT REFERENCES students(student_id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    photo_urls TEXT[],
    status TEXT DEFAULT 'safe',
    qr_code TEXT UNIQUE NOT NULL,
    
    -- ✅ All dynamic data stored here
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Example metadata content
```json
{
  "owner_name": "John Doe",
  "program": "BSCS",
  "year_section": "3rd Year – Section A",
  "registered_at": "2026-04-21T10:30:00Z",
  
  // Category-specific fields (varies by category)
  "holder_name": "John Doe",
  "id_type": "Student ID",
  "id_number": "1234"
}
```

## Category-Specific Fields Storage

### ID Category
```json
{
  "id_type": "Student ID",
  "id_number": "1234",
  "holder_name": "John Doe"
}
```

### Laptop Category
```json
{
  "brand": "Dell",
  "model": "Inspiron 15",
  "color": "Silver",
  "serial_number": "5678"
}
```

### Phone Category
```json
{
  "brand": "iPhone",
  "model": "iPhone 13",
  "color": "Blue",
  "case_description": "Clear case with stickers"
}
```

### Keys Category
```json
{
  "key_type": "Car keys",
  "keychain": "Red leather keychain",
  "number_of_keys": "3"
}
```

## Querying Category Fields

### Fetch item with category fields
```javascript
const { data: item } = await supabase
  .from('items')
  .select('*')
  .eq('id', itemId)
  .single();

// Access category fields
console.log('Item name:', item.name);
console.log('Category:', item.category);
console.log('Owner:', item.metadata.owner_name);
console.log('Program:', item.metadata.program);

// Category-specific fields
if (item.category === 'id') {
  console.log('ID Type:', item.metadata.id_type);
  console.log('Holder:', item.metadata.holder_name);
}

if (item.category === 'laptop') {
  console.log('Brand:', item.metadata.brand);
  console.log('Model:', item.metadata.model);
}
```

### SQL query with JSONB operators
```sql
-- Find all Dell laptops
SELECT * FROM items 
WHERE category = 'laptop' 
  AND metadata->>'brand' = 'Dell';

-- Find items by owner name
SELECT * FROM items 
WHERE metadata->>'owner_name' = 'John Doe';

-- Find student IDs
SELECT * FROM items 
WHERE category = 'id' 
  AND metadata->>'id_type' ILIKE '%student%';
```

## Benefits

✅ **Flexible schema** - Add new category fields without altering table
✅ **No column errors** - All dynamic data in JSONB
✅ **Easy to query** - JSONB operators for filtering
✅ **Clean database** - Only essential columns in table
✅ **Future-proof** - Add new categories without migrations

## Files Modified

1. **app/(tabs)/register.js** - `handleRegister()` function
   - Moved `...formData` from itemData root to metadata object

## Testing

Test each category to ensure fields save correctly:

- [ ] ID/Card - holder_name, id_type, id_number
- [ ] Keys - key_type, keychain, number_of_keys
- [ ] Laptop - brand, model, color, serial_number
- [ ] Phone - brand, model, color, case_description
- [ ] Bottle - brand, color, size, stickers
- [ ] Wallet - brand, color, material, contents
- [ ] Bag - bag_type, brand, color, size
- [ ] Watch - brand, type, color, features
- [ ] Headphones - brand, type, color, case_included
- [ ] Other - item_type, color, brand

## Verification Query

```sql
-- Check metadata structure for different categories
SELECT 
    id,
    name,
    category,
    metadata->>'owner_name' as owner,
    metadata->>'brand' as brand,
    metadata->>'id_type' as id_type,
    metadata
FROM items
LIMIT 10;
```

---

**Status**: ✅ COMPLETE
**Impact**: HIGH - Fixes registration for all categories
**Date**: 2026-04-21
