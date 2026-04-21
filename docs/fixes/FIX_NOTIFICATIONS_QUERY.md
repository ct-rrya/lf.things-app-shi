# Fix Notifications Query - AI Matches Foreign Key Issue

## Problem

Error: `Could not find a relationship between 'ai_matches' and 'items' in the schema cache`

This happens when:
1. The `ai_matches` table doesn't exist
2. The foreign key constraint is missing
3. The foreign key has a different name than expected

---

## Solution Steps

### Step 1: Diagnose the Issue

Run in Supabase SQL Editor:

```bash
database/diagnose-ai-matches.sql
```

This will tell you:
- ✅ Does `ai_matches` table exist?
- ✅ What columns does it have?
- ✅ What foreign keys are configured?
- ✅ Do related tables (`items`, `found_items`) exist?

### Step 2: Fix Based on Diagnosis

#### Scenario A: Table Doesn't Exist

Run:
```bash
database/create-ai-matches-table.sql
```

#### Scenario B: Table Exists But Missing Foreign Keys

Run:
```bash
database/add-ai-matches-foreign-keys.sql
```

#### Scenario C: Foreign Keys Exist But Have Different Names

Use the fallback query approach (see below).

---

## Updated Notifications Query

### Option 1: Using Foreign Key (Preferred)

If foreign keys are properly set up:

```javascript
// app/(tabs)/notifications.js

async function fetchNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Get user's item IDs first
    const { data: userItems } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', user.id);
    
    const itemIds = (userItems || []).map(item => item.id);
    
    if (itemIds.length === 0) {
      setNotifications([]);
      return;
    }
    
    // Fetch matches with foreign key relationship
    const { data: matches, error } = await supabase
      .from('ai_matches')
      .select(`
        *,
        lost_item:items!ai_matches_lost_item_id_fkey(
          id,
          name,
          category,
          photo_urls
        ),
        found_item:found_items!ai_matches_found_item_id_fkey(
          id,
          category,
          description,
          photo_urls
        )
      `)
      .in('lost_item_id', itemIds)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    setNotifications(matches || []);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}
```

### Option 2: Fallback Without Foreign Keys

If foreign keys don't work, use manual joins:

```javascript
// app/(tabs)/notifications.js

async function fetchNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Step 1: Get user's item IDs
    const { data: userItems } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', user.id);
    
    const itemIds = (userItems || []).map(item => item.id);
    
    if (itemIds.length === 0) {
      setNotifications([]);
      return;
    }
    
    // Step 2: Get matches (without foreign key relationship)
    const { data: matches, error: matchError } = await supabase
      .from('ai_matches')
      .select('*')
      .in('lost_item_id', itemIds)
      .order('created_at', { ascending: false });
    
    if (matchError) throw matchError;
    
    if (!matches || matches.length === 0) {
      setNotifications([]);
      return;
    }
    
    // Step 3: Manually fetch related items
    const lostItemIds = [...new Set(matches.map(m => m.lost_item_id))];
    const foundItemIds = [...new Set(matches.map(m => m.found_item_id))];
    
    const [lostItemsResult, foundItemsResult] = await Promise.all([
      supabase
        .from('items')
        .select('id, name, category, photo_urls')
        .in('id', lostItemIds),
      supabase
        .from('found_items')
        .select('id, category, description, photo_urls')
        .in('id', foundItemIds)
    ]);
    
    // Step 4: Create lookup maps
    const lostItemsMap = {};
    (lostItemsResult.data || []).forEach(item => {
      lostItemsMap[item.id] = item;
    });
    
    const foundItemsMap = {};
    (foundItemsResult.data || []).forEach(item => {
      foundItemsMap[item.id] = item;
    });
    
    // Step 5: Combine data
    const enrichedMatches = matches.map(match => ({
      ...match,
      lost_item: lostItemsMap[match.lost_item_id] || null,
      found_item: foundItemsMap[match.found_item_id] || null,
    }));
    
    setNotifications(enrichedMatches);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    Alert.alert('Error', 'Could not load notifications');
  }
}
```

### Option 3: Simplified (No Item Details)

If you just need basic match info:

```javascript
async function fetchNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Get user's item IDs
    const { data: userItems } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', user.id);
    
    const itemIds = (userItems || []).map(item => item.id);
    
    if (itemIds.length === 0) {
      setNotifications([]);
      return;
    }
    
    // Get matches without relationships
    const { data: matches, error } = await supabase
      .from('ai_matches')
      .select('*')
      .in('lost_item_id', itemIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    setNotifications(matches || []);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}
```

---

## Complete Updated notifications.js

Here's a robust version that tries foreign keys first, then falls back:

```javascript
async function fetchNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setNotifications([]);
      return;
    }
    
    // Get user's item IDs
    const { data: userItems } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', user.id);
    
    const itemIds = (userItems || []).map(item => item.id);
    
    if (itemIds.length === 0) {
      setNotifications([]);
      return;
    }
    
    // Try with foreign key first
    let { data: matches, error } = await supabase
      .from('ai_matches')
      .select(`
        *,
        lost_item:items!ai_matches_lost_item_id_fkey(id, name, category, photo_urls),
        found_item:found_items!ai_matches_found_item_id_fkey(id, category, description, photo_urls)
      `)
      .in('lost_item_id', itemIds)
      .order('created_at', { ascending: false });
    
    // If foreign key fails, use fallback
    if (error && error.message.includes('relationship')) {
      console.warn('Foreign key not found, using fallback query');
      
      // Fallback: fetch without relationships
      const { data: basicMatches, error: fallbackError } = await supabase
        .from('ai_matches')
        .select('*')
        .in('lost_item_id', itemIds)
        .order('created_at', { ascending: false });
      
      if (fallbackError) throw fallbackError;
      
      matches = basicMatches;
    } else if (error) {
      throw error;
    }
    
    setNotifications(matches || []);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    Alert.alert('Error', 'Could not load notifications');
  }
}
```

---

## Testing

After applying the fix:

1. **Check table exists:**
   ```sql
   SELECT * FROM ai_matches LIMIT 1;
   ```

2. **Check foreign keys:**
   ```sql
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'ai_matches' 
   AND constraint_type = 'FOREIGN KEY';
   ```

3. **Test query in Supabase:**
   ```sql
   SELECT 
     am.*,
     i.name as lost_item_name,
     fi.category as found_item_category
   FROM ai_matches am
   LEFT JOIN items i ON i.id = am.lost_item_id
   LEFT JOIN found_items fi ON fi.id = am.found_item_id
   LIMIT 5;
   ```

---

## Summary

1. ✅ Run `database/diagnose-ai-matches.sql` to check current state
2. ✅ Run appropriate fix SQL based on diagnosis
3. ✅ Update notifications.js with fallback query
4. ✅ Test in app

The fallback approach ensures your app works even if foreign keys aren't configured properly.
