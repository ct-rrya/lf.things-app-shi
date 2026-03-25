# Match Notification Setup Guide

## Overview
When AI finds a match between a found item and a registered item, the owner should receive a push notification that navigates them to view the finder's report.

## Notification Payload Format

When sending a push notification for a match, use this data structure:

```javascript
{
  title: "Possible Match Found!",
  body: "AI found a 87% match for your Laptop",
  data: {
    found_item_id: "<UUID>",  // ✅ The found_items.id
    match_score: 87            // Optional: display in notification
  }
}
```

### ❌ Wrong Payload
```javascript
{
  data: {
    id: registered_item_id  // This navigates to owner's own item
  }
}
```

### ✅ Correct Payload
```javascript
{
  data: {
    found_item_id: found_item_id  // This navigates to finder's report
  }
}
```

## Navigation Flow

1. User taps notification
2. App reads `data.found_item_id` from notification
3. Navigates to `/found/${found_item_id}`
4. Screen fetches found item details from `found_items` table
5. Screen fetches match info from `ai_matches` table
6. User sees:
   - Finder's photo
   - Found item details (brand, color, etc.)
   - Where & when it was found
   - AI match reasoning
   - Action buttons: "Yes, this is my item" / "Not my item"

## Database Schema

### ai_matches table
```sql
CREATE TABLE ai_matches (
  id UUID PRIMARY KEY,
  lost_item_id UUID,      -- Owner's registered item
  found_item_id UUID,     -- Finder's report ← drives navigation
  match_score DECIMAL,
  match_details JSONB,
  status TEXT,            -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ
);
```

## Implementation Status

✅ Notification listener added to `app/_layout.js`
✅ Notification card in `app/(tabs)/notifications.js` navigates to found report
✅ `app/found/[id].js` transformed to show finder's report with action buttons
✅ Match confirmation/rejection updates `ai_matches.status`
✅ Chat navigation after match confirmation
✅ "Chat with Finder" button appears after confirmation

## User Flow

1. **Finder reports found item** → AI creates matches in `ai_matches` table
2. **Owner receives push notification** with `found_item_id` in data payload
3. **Owner taps notification** → App navigates to `/found/${found_item_id}`
4. **Owner reviews found report**:
   - Sees finder's photo
   - Reads item details (brand, color, model, etc.)
   - Checks where & when it was found
   - Reviews AI match reasoning
5. **Owner takes action**:
   - Taps "Yes, this is my item" → Status updates to 'accepted'
   - Alert offers "Start Chat" or "Later"
   - "Chat with Finder" button appears on screen
   - OR taps "Not my item" → Status updates to 'rejected'
6. **Owner chats with finder** to arrange pickup

## Next Steps

To complete the notification system, you need to:

1. **Set up Expo Push Notifications** (if not already done)
   - Configure push notification credentials
   - Request user permission
   - Store push tokens in database

2. **Send notifications when matches are created**
   - In `app/(tabs)/report-found.js` after creating matches
   - Or use a Supabase Edge Function triggered on `ai_matches` insert
   - Send to owner's push token with correct payload format

3. **Test the flow**
   - Create a found report
   - Verify match notification is sent
   - Tap notification
   - Verify navigation to found report detail
   - Test confirm/reject actions

## Example: Sending Notification

```javascript
// After creating match in report-found.js
const { data: ownerData } = await supabase
  .from('profiles')
  .select('push_token')
  .eq('user_id', match.lostItem.user_id)
  .single();

if (ownerData?.push_token) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: ownerData.push_token,
      title: 'Possible Match Found!',
      body: `AI found a ${Math.round(match.score)}% match for your ${match.lostItem.name}`,
      data: {
        found_item_id: foundItem.id,
        match_score: match.score,
      },
    }),
  });
}
```


## Testing Checklist

### Manual Testing Steps

1. **Test notification navigation**:
   ```javascript
   // Simulate notification tap in app
   Notifications.scheduleNotificationAsync({
     content: {
       title: "Test Match",
       body: "Testing notification navigation",
       data: { found_item_id: "<existing_found_item_id>" }
     },
     trigger: { seconds: 2 }
   });
   ```
   - Tap notification when it appears
   - Verify navigation to found report detail screen

2. **Test from notifications tab**:
   - Go to Alerts tab
   - Find a match notification card
   - Tap "View Details"
   - Verify navigation to found report (not registered item)

3. **Test found report detail screen**:
   - Verify all finder's data displays correctly:
     - Photo from finder
     - Brand, model, color, etc.
     - Found location and date
     - AI match score badge
     - AI reasoning (if available)
   - Verify action buttons appear for pending matches
   - Verify status banner appears for accepted/rejected matches

4. **Test match confirmation**:
   - Tap "Yes, this is my item"
   - Verify alert appears with "Start Chat" and "Later" options
   - Tap "Start Chat" → verify navigation to chat screen
   - Go back to found report → verify "Chat with Finder" button appears
   - Verify status banner shows "You confirmed this match"

5. **Test match rejection**:
   - Find another pending match
   - Tap "Not my item"
   - Verify alert appears
   - Verify status updates to rejected
   - Verify status banner shows "You marked this as not your item"

### Database Verification

Check that the `ai_matches` table has correct data:

```sql
-- View all matches with details
SELECT 
  m.id,
  m.match_score,
  m.status,
  i.name as lost_item_name,
  f.category as found_category,
  f.found_location
FROM ai_matches m
JOIN items i ON i.id = m.lost_item_id
JOIN found_items f ON f.id = m.found_item_id
ORDER BY m.created_at DESC;
```

### Common Issues

**Issue**: Notification doesn't navigate
- Check: Is `expo-notifications` installed?
- Check: Is notification listener in `_layout.js`?
- Check: Does notification data have `found_item_id`?

**Issue**: Wrong screen shows up
- Check: Navigation uses `found_item_id` not `lost_item_id`
- Check: Route is `/found/${id}` not `/item/${id}`

**Issue**: No match info displays
- Check: Query joins `ai_matches` with user's items
- Check: RLS policies allow owner to view matches

**Issue**: Action buttons don't work
- Check: `matchInfo` state is populated
- Check: Database update permissions
- Check: Status updates to 'accepted' or 'rejected'


## Chat Feature Setup

After confirming a match, owners and finders can chat to arrange pickup.

### Database Setup

Run the SQL script to create the messages table:

```bash
# Execute match-messages-schema.sql in your Supabase SQL editor
```

The `match_messages` table stores:
- `match_id` - Links to the confirmed match
- `sender_id` - User who sent the message
- `message` - Message content
- `created_at` - Timestamp

### Features

- Real-time messaging using Supabase Realtime
- Message history persists in database
- Only works for accepted matches (status = 'accepted')
- Both owner and finder can send messages
- Automatic scroll to latest message
- Shows sender role (Owner/Finder) in header

### Navigation to Chat

Chat can be accessed from:
1. Alert after confirming match → "Start Chat" button
2. Found report detail screen → "Chat with Finder" button (appears after confirmation)
3. Direct navigation: `router.push(\`/chat/\${match_id}\`)`

### Security

RLS policies ensure:
- Users can only view messages for their own matches
- Users can only send messages in accepted matches
- Messages are tied to authenticated users
