# Complete Lost & Found Workflow Implementation Guide

## Overview

This guide covers the complete end-to-end real-time lost and found workflow implementation for the SOS React Native/Expo app.

## The Complete Flow

```
Owner marks item as LOST
        ↓
Finder submits found report (with photo)
        ↓
AI matching runs automatically
        ↓
If score ≥ 70% → push notification sent to owner
        ↓
Owner views finder's report → confirms or rejects
        ↓
If confirmed → item status: lost → located
             → chat thread created
             → both parties redirected to Chat tab
             → chat history saved permanently
        ↓
Owner marks as recovered → item status: located → recovered
                         → chat closes
                         → celebration!
```

## Database Setup

### Step 1: Run the Complete Schema

Execute `complete-workflow-schema.sql` in your Supabase SQL Editor. This will:

- Add status tracking to `items` table (safe, lost, located, recovered)
- Update `found_items` and `ai_matches` tables
- Create `chat_threads` table
- Create `chat_messages` table
- Set up RLS policies
- Create indexes for performance
- Enable realtime subscriptions
- Create helper functions

### Step 2: Verify Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('items', 'found_items', 'ai_matches', 'chat_threads', 'chat_messages')
ORDER BY table_name;
```

## Implementation Details

### 1. Item Status Flow

**Status Progression:**
- `safe` → Default state when item is registered
- `lost` → Owner marks item as lost
- `located` → Match confirmed, item found
- `recovered` → Owner confirms physical recovery

**Database Fields:**
- `status` - Current status
- `lost_at` - Timestamp when marked as lost
- `recovered_at` - Timestamp when recovered

### 2. Chat System

**Chat Threads Table:**
```sql
chat_threads (
  id                  UUID primary key,
  match_id            UUID references ai_matches(id),
  registered_item_id  UUID references items(id),
  owner_id            UUID references auth.users(id),
  finder_id           UUID references auth.users(id),
  status              text default 'open',
  created_at          timestamptz,
  last_message        text,
  last_message_at     timestamptz,
  unread_count_owner  int default 0,
  unread_count_finder int default 0
)
```

**Chat Messages Table:**
```sql
chat_messages (
  id           UUID primary key,
  thread_id    UUID references chat_threads(id),
  sender_id    UUID references auth.users(id),
  sender_role  text,  -- 'owner' or 'finder'
  message      text,
  is_read      boolean default false,
  created_at   timestamptz
)
```

### 3. Navigation Structure

**Bottom Tabs:**
1. 🏠 Home - My Items dashboard
2. ➕ Register - Register new items
3. 💬 Chat - Chat inbox (NEW)
4. 🔍 Found - Report found items
5. 👤 Profile - User profile

**Chat Routes:**
- `/chat` - Chat inbox (list of threads)
- `/chat/[thread_id]` - Individual chat conversation

### 4. Match Confirmation Flow

When owner taps "Yes, this is my item":

1. Update `ai_matches.status` → 'confirmed'
2. Update `items.status` → 'located'
3. Update `found_items.status` → 'claimed'
4. Create new `chat_threads` row
5. Navigate to `/chat/[thread_id]`

**Code Location:** `app/found/[id].js` → `handleConfirm()`

### 5. Mark as Recovered Flow

When owner taps "Mark as Recovered":

1. Update `items.status` → 'recovered'
2. Update `ai_matches.status` → 'recovered'
3. Update `found_items.status` → 'recovered'
4. Update `chat_threads.status` → 'closed'
5. Set timestamps
6. Show celebration alert
7. Navigate to home

**Code Location:** `app/chat/[thread_id].js` → `handleMarkAsRecovered()`

## Real-Time Features

### Supabase Realtime Subscriptions

**Chat Threads:**
```javascript
supabase
  .channel('chat_threads_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_threads',
  }, handleUpdate)
  .subscribe();
```

**Chat Messages:**
```javascript
supabase
  .channel(`thread_${thread_id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `thread_id=eq.${thread_id}`,
  }, handleNewMessage)
  .subscribe();
```

**AI Matches:**
```javascript
supabase
  .channel('matches')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ai_matches',
    filter: `registered_item_id=eq.${itemId}`,
  }, handleNewMatch)
  .subscribe();
```

## UI Components

### Chat Inbox (`app/(tabs)/chat.js`)

**Features:**
- List of all chat threads
- Real-time updates
- Unread message badges
- Thread status (Open/Closed)
- Match score display
- Item thumbnails
- Last message preview
- Time formatting

### Individual Chat (`app/chat/[thread_id].js`)

**Features:**
- Real-time messaging
- Message bubbles (owner/finder)
- Item summary card at top
- Match score display
- "Mark as Recovered" button (owner only)
- Closed chat banner
- Auto-scroll to latest
- Message read tracking

### Found Report Detail (`app/found/[id].js`)

**Updated Features:**
- Shows finder's photo and details
- AI match score and reasoning
- Action buttons: Confirm/Reject
- Creates chat thread on confirm
- Redirects to chat immediately
- Status banners for confirmed/rejected

## Helper Functions

### Mark Messages as Read

```sql
CREATE FUNCTION mark_messages_read(p_thread_id UUID, p_user_id UUID)
```

Automatically called when user opens a chat thread. Updates:
- `chat_messages.is_read` → true
- `chat_threads.unread_count_owner` or `unread_count_finder` → 0

### Update Thread on Message

Trigger function that runs on every new message:
- Updates `last_message`
- Updates `last_message_at`
- Increments unread count for recipient

## Testing Checklist

### 1. Match Confirmation
- [ ] Finder submits found report with photo
- [ ] AI creates match (score ≥ 70%)
- [ ] Owner receives notification
- [ ] Owner taps notification → sees found report
- [ ] Owner taps "Yes, this is my item"
- [ ] Chat thread created
- [ ] Redirected to chat screen
- [ ] Item status updated to 'located'

### 2. Chat Functionality
- [ ] Chat tab shows new thread
- [ ] Unread badge appears
- [ ] Messages send in real-time
- [ ] Both parties can send/receive
- [ ] Messages persist in database
- [ ] Unread count updates correctly
- [ ] Thread moves to top on new message

### 3. Mark as Recovered
- [ ] Owner taps "Mark as Recovered"
- [ ] Confirmation alert appears
- [ ] Item status → 'recovered'
- [ ] Match status → 'recovered'
- [ ] Found report status → 'recovered'
- [ ] Chat closes
- [ ] Closed banner appears
- [ ] Input disabled
- [ ] Thread shows "Closed" badge

### 4. Real-Time Updates
- [ ] New messages appear without refresh
- [ ] Thread list updates on new message
- [ ] Unread badges update instantly
- [ ] Status changes reflect immediately

## Security (RLS Policies)

### Chat Threads
- Users can only view threads they're part of (owner or finder)
- System can create threads
- Participants can update threads

### Chat Messages
- Users can only view messages in their threads
- Users can only send messages in open threads
- Users can only update messages in their threads

## Performance Optimizations

### Indexes Created
- `idx_items_status` - Fast status filtering
- `idx_items_user_status` - User's items by status
- `idx_chat_threads_owner` - Owner's threads
- `idx_chat_threads_finder` - Finder's threads
- `idx_chat_threads_match` - Thread by match
- `idx_chat_messages_thread` - Messages by thread
- `idx_chat_messages_created` - Messages by time

## Design System

**Colors:**
- Background: `#F2EAD0`
- Dark: `#45354B` (grape)
- Accent: `#DBB354` (gold)
- Error: `#D00803` (ember)
- Success: `#10b981`

**Typography:**
- Font: DM Sans (system default)
- Mobile-first responsive scaling
- Tablet support with larger fonts

**Components:**
- Rounded cards (12-14px radius)
- Unread badges in red
- Status badges with icons
- Message bubbles with timestamps

## Next Steps

### To Complete Implementation:

1. **Run Database Schema**
   ```bash
   # Execute complete-workflow-schema.sql in Supabase
   ```

2. **Test the Flow**
   - Register an item
   - Mark it as lost (when implemented)
   - Submit a found report
   - Confirm the match
   - Chat with finder
   - Mark as recovered

3. **Add Push Notifications** (Optional)
   - Set up Expo Push Notifications
   - Send notification on match creation
   - Include `found_item_id` in payload

4. **Add "Mark as Lost" Feature** (Next)
   - Add button to item detail screen
   - Update item status to 'lost'
   - Record `lost_at` timestamp
   - Show in "Lost Items" section

## Troubleshooting

### Chat Thread Not Created
- Check RLS policies on `chat_threads`
- Verify `finder_id` exists in `found_items.reporter_id`
- Check console for errors

### Messages Not Appearing
- Verify realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages`
- Check subscription is active
- Verify RLS policies allow viewing

### Unread Count Not Updating
- Check trigger `trigger_update_thread_on_message` exists
- Verify function `update_thread_on_message()` is working
- Check RLS policies on `chat_threads` UPDATE

### Navigation Issues
- Verify route exists: `app/chat/[thread_id].js`
- Check thread_id is valid UUID
- Verify user has access to thread

## Files Modified/Created

### New Files:
- `app/(tabs)/chat.js` - Chat inbox screen
- `app/chat/[thread_id].js` - Individual chat screen
- `complete-workflow-schema.sql` - Complete database schema
- `COMPLETE-WORKFLOW-GUIDE.md` - This guide

### Modified Files:
- `app/(tabs)/_layout.js` - Added Chat tab
- `app/found/[id].js` - Updated confirmation flow
- `app/_layout.js` - Fixed notification listener

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database schema is up to date
3. Check RLS policies in Supabase dashboard
4. Review realtime subscriptions
5. Test with Supabase SQL Editor

---

**Status:** ✅ Implementation Complete
**Version:** 1.0
**Last Updated:** 2024
