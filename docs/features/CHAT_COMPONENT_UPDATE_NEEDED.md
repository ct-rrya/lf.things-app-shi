# Chat Component Update Required

The current `app/chat/[thread_id].js` component references old database schema columns that no longer exist.

## Issues Found

### 1. Old Schema References
The component tries to query:
- `chat_threads.registered_item_id` → Should be `item_id`
- `chat_threads.match_id` → This column doesn't exist in new schema
- `chat_messages.sender_role` → This column doesn't exist (use `sender_id` comparison instead)
- Uses `mark_messages_read` RPC function → Should use direct UPDATE query

### 2. Missing Functionality
- No proper thread creation from QR scan page
- No integration with new `is_read` boolean field
- References AI matches that may not exist for all threads

## Required Updates

### Update 1: Fix fetchThreadInfo()

**Current (WRONG):**
```javascript
const { data, error } = await supabase
  .from('chat_threads')
  .select(`
    *,
    registered_item:items!chat_threads_registered_item_id_fkey(
      id, name, category, photo_urls
    ),
    match:ai_matches!chat_threads_match_id_fkey(
      id, match_score, status
    )
  `)
  .eq('id', thread_id)
  .single();
```

**Should be:**
```javascript
const { data, error } = await supabase
  .from('chat_threads')
  .select(`
    *,
    item:items(id, name, category, photo_urls, user_id)
  `)
  .eq('id', thread_id)
  .single();
```

### Update 2: Fix markMessagesAsRead()

**Current (WRONG):**
```javascript
await supabase.rpc('mark_messages_read', {
  p_thread_id: thread_id,
  p_user_id: user.id,
});
```

**Should be:**
```javascript
const { error } = await supabase
  .from('chat_messages')
  .update({ is_read: true })
  .eq('thread_id', thread_id)
  .neq('sender_id', user.id) // Don't mark own messages as read
  .eq('is_read', false);
```

### Update 3: Fix sendMessage()

**Current (WRONG):**
```javascript
const { error } = await supabase
  .from('chat_messages')
  .insert({
    thread_id,
    sender_id: currentUserId,
    sender_role: isOwner ? 'owner' : 'finder', // ❌ Column doesn't exist
    message: newMessage.trim(),
  });
```

**Should be:**
```javascript
const { error } = await supabase
  .from('chat_messages')
  .insert({
    thread_id,
    sender_id: currentUserId,
    message: newMessage.trim(),
    is_read: false,
  });
```

### Update 4: Simplify handleMarkAsRecovered()

The current function tries to update AI matches and found items, but threads can exist without matches. Simplify to:

```javascript
async function handleMarkAsRecovered() {
  if (!isOwner) return;

  Alert.alert(
    'Mark as Returned?',
    'This will close the chat and mark the item as safe.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            // Update item status
            await supabase
              .from('items')
              .update({ status: 'safe' })
              .eq('id', threadInfo.item_id);

            // Close chat thread
            await supabase
              .from('chat_threads')
              .update({ status: 'resolved' })
              .eq('id', thread_id);

            Alert.alert('✅ Item Returned!', 'The item has been marked as safe.');
            router.push('/(tabs)/home');
          } catch (err) {
            console.error('Error:', err);
            Alert.alert('Error', 'Failed to mark item as recovered');
          }
        },
      },
    ]
  );
}
```

### Update 5: Fix UI References

**Current (WRONG):**
```javascript
<Text>Re: {threadInfo?.registered_item?.name}</Text>
```

**Should be:**
```javascript
<Text>Re: {threadInfo?.item?.name}</Text>
```

## Integration with QR Scan Page

Add to `app/scan/[token].js`:

```javascript
async function handleContactOwner() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to contact the owner');
      return;
    }
    
    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('item_id', item.id)
      .eq('finder_id', user.id)
      .maybeSingle();
    
    if (existingThread) {
      // Thread exists, navigate to it
      router.push(`/chat/${existingThread.id}`);
      return;
    }
    
    // Create new thread
    const { data: newThread, error } = await supabase
      .from('chat_threads')
      .insert({
        item_id: item.id,
        owner_id: item.user_id,
        finder_id: user.id,
        status: 'active',
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    router.push(`/chat/${newThread.id}`);
  } catch (err) {
    console.error('Error creating chat:', err);
    Alert.alert('Error', 'Could not start chat');
  }
}
```

## Summary

The chat component needs these fixes:
1. ✅ Update all database queries to use new schema
2. ✅ Remove references to `match_id` and `sender_role`
3. ✅ Fix `markMessagesAsRead()` to use direct UPDATE
4. ✅ Simplify `handleMarkAsRecovered()`
5. ✅ Update UI to reference `item` instead of `registered_item`
6. ✅ Add thread creation logic to QR scan page

Would you like me to create the fully updated chat component file?
