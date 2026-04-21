# Chat System Setup Guide

Complete guide to setting up the chat system for owner-finder communication.

## Overview

The chat system allows finders who scan QR codes to communicate directly with item owners. It includes:
- Real-time messaging using Supabase Realtime
- Read/unread status tracking
- Thread management (active, resolved, archived)
- Secure RLS policies

---

## Step 1: Create Database Tables

Run the SQL migration in your Supabase SQL Editor:

```bash
# File: database/create-chat-tables.sql
```

This creates:
- `chat_threads` table - Conversations between owner and finder
- `chat_messages` table - Individual messages
- RLS policies for security
- Indexes for performance
- Triggers to auto-update timestamps
- Helper view `chat_threads_with_info`

### Verify Tables Were Created

Run in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_threads', 'chat_messages');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_threads', 'chat_messages');
```

---

## Step 2: Enable Realtime (Optional but Recommended)

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for:
   - `chat_threads`
   - `chat_messages`

This allows real-time message updates without polling.

---

## Step 3: Database Schema

### chat_threads Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_id | UUID | References items.id |
| owner_id | UUID | Item owner (references auth.users) |
| finder_id | UUID | Person who found item (references auth.users) |
| status | TEXT | 'active', 'resolved', or 'archived' |
| created_at | TIMESTAMPTZ | When thread was created |
| updated_at | TIMESTAMPTZ | Last message timestamp |

**Constraints:**
- UNIQUE(item_id, finder_id) - One thread per item-finder pair

### chat_messages Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| thread_id | UUID | References chat_threads.id |
| sender_id | UUID | Who sent the message (references auth.users) |
| message | TEXT | Message content (1-5000 chars) |
| is_read | BOOLEAN | Whether recipient has read it |
| created_at | TIMESTAMPTZ | When message was sent |

---

## Step 4: How the Chat System Works

### Flow 1: Finder Initiates Chat (from QR Scan)

1. Finder scans QR code → lands on `/scan/[token]` page
2. Page shows item details with "Contact Owner" button
3. Clicking button:
   - Checks if thread exists between finder and owner
   - If not, creates new thread
   - Navigates to `/chat/[thread_id]`

### Flow 2: Owner Receives Message

1. Owner sees notification (if implemented)
2. Owner navigates to chat from notifications or item detail page
3. Opens `/chat/[thread_id]`
4. Can reply to finder

### Flow 3: Marking Thread as Resolved

When item is returned:
- Either party can mark thread as "resolved"
- Thread remains accessible but marked as complete

---

## Step 5: Using the Chat Component

The chat page is at `app/chat/[thread_id].js`. It handles:
- Loading thread and messages
- Sending new messages
- Real-time message updates
- Marking messages as read
- Showing sender names

### Example: Creating a Thread

```javascript
import { supabase } from '../lib/supabase';

async function createChatThread(itemId, ownerId, finderId) {
  // Check if thread already exists
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('item_id', itemId)
    .eq('finder_id', finderId)
    .maybeSingle();
  
  if (existing) {
    return existing.id; // Thread already exists
  }
  
  // Create new thread
  const { data: newThread, error } = await supabase
    .from('chat_threads')
    .insert({
      item_id: itemId,
      owner_id: ownerId,
      finder_id: finderId,
      status: 'active',
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return newThread.id;
}
```

### Example: Sending a Message

```javascript
async function sendMessage(threadId, senderId, messageText) {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      message: messageText.trim(),
      is_read: false,
    });
  
  if (error) throw error;
}
```

### Example: Marking Messages as Read

```javascript
async function markMessagesAsRead(threadId, currentUserId) {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .neq('sender_id', currentUserId) // Don't mark own messages
    .eq('is_read', false);
  
  if (error) console.error('Error marking as read:', error);
}
```

---

## Step 6: Real-time Subscriptions

Enable real-time message updates:

```javascript
useEffect(() => {
  const channel = supabase
    .channel(`chat_${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        // Add new message to state
        setMessages((prev) => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [threadId]);
```

---

## Step 7: Security (RLS Policies)

The RLS policies ensure:
- Users can only see threads they're part of (owner or finder)
- Users can only send messages in their own threads
- Users can only mark messages as read in their threads
- No one can delete messages (only INSERT/SELECT/UPDATE allowed)

---

## Step 8: Integration Points

### From QR Scan Page (`app/scan/[token].js`)

Add "Contact Owner" button:

```javascript
<TouchableOpacity
  style={styles.contactButton}
  onPress={async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to contact the owner');
      return;
    }
    
    // Create or get thread
    const threadId = await createChatThread(
      item.id,
      item.user_id, // owner
      user.id // finder
    );
    
    router.push(`/chat/${threadId}`);
  }}
>
  <Text>Contact Owner</Text>
</TouchableOpacity>
```

### From Item Detail Page (`app/item/[id].js`)

Show chat threads for this item:

```javascript
const { data: threads } = await supabase
  .from('chat_threads')
  .select('*, chat_messages(count)')
  .eq('item_id', itemId)
  .eq('owner_id', currentUserId);
```

---

## Step 9: Testing the Chat System

1. **Create a test thread:**
   ```sql
   INSERT INTO chat_threads (item_id, owner_id, finder_id)
   VALUES (
     '[item-uuid]',
     '[owner-user-id]',
     '[finder-user-id]'
   );
   ```

2. **Send a test message:**
   ```sql
   INSERT INTO chat_messages (thread_id, sender_id, message)
   VALUES (
     '[thread-uuid]',
     '[sender-user-id]',
     'Test message'
   );
   ```

3. **Check the view:**
   ```sql
   SELECT * FROM chat_threads_with_info;
   ```

---

## Troubleshooting

### Error: "Could not find the table 'public.chat_threads'"
- Run the migration SQL in Supabase SQL Editor
- Verify tables exist with verification queries

### Error: "new row violates row-level security policy"
- Check that RLS policies are created
- Verify user is authenticated
- Ensure user is either owner_id or finder_id in the thread

### Messages not appearing in real-time
- Enable Realtime replication in Supabase Dashboard
- Check subscription is active in browser console
- Verify channel name matches thread_id

### Can't send messages
- Verify sender_id matches authenticated user
- Check thread exists and user is participant
- Ensure message is not empty and under 5000 chars

---

## Next Steps

1. ✅ Run `database/create-chat-tables.sql` in Supabase
2. ✅ Enable Realtime replication
3. ✅ Test chat functionality
4. Add notification system for new messages
5. Add typing indicators (optional)
6. Add message attachments (optional)

---

## Files Reference

- `database/create-chat-tables.sql` - Database migration
- `app/chat/[thread_id].js` - Chat UI component
- `lib/chatService.js` - Chat helper functions
- This guide - Setup instructions

---

**Status:** Ready to use after running the SQL migration!
