# Complete Database Redesign Implementation Guide

## Overview

This guide walks you through implementing the complete database redesign for your Lost & Found app. The new schema provides a clean separation between students (masterlist), users (signed up accounts), items, lost reports, scan events, notifications, and chat messages.

## Step 1: Backup Current Database

Before making any changes, backup your current database:

```sql
-- Export current data (run in Supabase SQL Editor)
-- Save the results of these queries

SELECT * FROM students;
SELECT * FROM users;
SELECT * FROM items;
-- ... export other tables as needed
```

## Step 2: Run the Complete Schema

1. Open Supabase Dashboard → SQL Editor
2. Open `database/complete-redesign-schema.sql`
3. Run the entire script

This will:
- Drop existing tables (if they exist)
- Create new tables with proper structure
- Set up foreign keys and indexes
- Configure Row Level Security (RLS) policies
- Create triggers for auto-updates
- Add helper functions
- Insert sample student data

## Step 3: Populate Students Masterlist

The students table must be pre-populated by admin before users can sign up.

```sql
-- Example: Bulk insert students from CSV or manual entry
INSERT INTO students (student_id, first_name, last_name, middle_name, program, year_level, section, email, phone_number, status)
VALUES
  ('2021-12345', 'Juan', 'Dela Cruz', 'Santos', 'BSIT', '3rd Year', 'A', 'juan.delacruz@university.edu', '09171234567', 'active'),
  ('2021-12346', 'Maria', 'Garcia', 'Reyes', 'BSCS', '2nd Year', 'B', 'maria.garcia@university.edu', '09181234567', 'active'),
  ('2021-12347', 'Pedro', 'Santos', 'Lopez', 'BSED-Math', '4th Year', 'A', 'pedro.santos@university.edu', '09191234567', 'active');
```

## Step 4: Update Your App Code

### 4.1 Update Authentication

Replace your current auth logic with the new `lib/authService.js`:

```javascript
import { signUpWithValidation, loginWithEmailOrStudentId } from '../lib/authService';

// Sign Up
const result = await signUpWithValidation({
  studentId: '2021-12345',
  email: 'juan.delacruz@university.edu',
  password: 'password123',
  phoneNumber: '09171234567', // optional
});

// Login with email OR student ID
const result = await loginWithEmailOrStudentId({
  identifier: '2021-12345', // or 'juan.delacruz@university.edu'
  password: 'password123',
});
```

### 4.2 Update Item Registration

Use the new `ItemRegistrationForm` component:

```javascript
import ItemRegistrationForm from '../components/ItemRegistrationForm';

<ItemRegistrationForm
  userId={user.id}
  studentId={user.student_id}
  onSuccess={(item) => {
    // Show QR code, navigate to item details, etc.
    console.log('Item registered:', item);
  }}
/>
```

### 4.3 Update Lost Reporting

Use the new `LostReportForm` component:

```javascript
import LostReportForm from '../components/LostReportForm';

<LostReportForm
  item={selectedItem}
  userId={user.id}
  onSuccess={(report) => {
    // Navigate back, refresh list, etc.
    console.log('Report created:', report);
  }}
  onCancel={() => {
    // Close modal, navigate back, etc.
  }}
/>
```

### 4.4 Update QR Scanning

```javascript
import { handleAppScan, handleWebScan } from '../lib/scanService';

// For logged-in users (app)
const result = await handleAppScan(qrCode, userId);
if (result.success) {
  if (result.isOwner) {
    // Show owner view
  } else {
    // Show finder options: return_to_ssg, chat_with_owner, report_found
  }
}

// For web/anonymous scans
const result = await handleWebScan(qrCode, ipAddress);
if (result.success) {
  // Show basic item info and message
  console.log(result.message);
}
```

### 4.5 Update Notifications

```javascript
import { 
  getUserNotifications, 
  subscribeToNotifications,
  markNotificationAsRead 
} from '../lib/notificationService';

// Get notifications
const { notifications } = await getUserNotifications(userId);

// Subscribe to real-time notifications
const unsubscribe = subscribeToNotifications(userId, (notification) => {
  console.log('New notification:', notification);
  // Show toast, update badge, etc.
});

// Cleanup
return () => unsubscribe();
```

### 4.6 Update Chat

```javascript
import { 
  startChatWithOwner,
  sendMessage,
  getChatMessages,
  subscribeToChatMessages 
} from '../lib/chatService';

// Start chat when finder scans item
const result = await startChatWithOwner(itemId, scannerUserId);

// Send message
await sendMessage({
  itemId,
  fromUserId: currentUserId,
  toUserId: otherUserId,
  message: 'I found your item!',
});

// Subscribe to real-time messages
const unsubscribe = subscribeToChatMessages(itemId, userId, (message) => {
  console.log('New message:', message);
});
```

## Step 5: Create Storage Bucket for Photos

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `item-photos`
3. Set it to public
4. Configure policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload item photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-photos');

-- Allow anyone to view photos
CREATE POLICY "Anyone can view item photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-photos');
```

## Step 6: Set Up Edge Functions (Optional)

For advanced notification features, create Supabase Edge Functions:

### Email Notification Function

```typescript
// supabase/functions/send-email-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { userId, title, body } = await req.json();
  
  // Get user email
  // Send email via SendGrid, Resend, etc.
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy:
```bash
supabase functions deploy send-email-notification
```

## Step 7: Update Environment Variables

Add to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Step 8: Testing Checklist

### Authentication
- [ ] Sign up with valid student_id validates against masterlist
- [ ] Sign up with invalid student_id is rejected
- [ ] Sign up with mismatched email is rejected
- [ ] Login with email works
- [ ] Login with student_id works
- [ ] User profile includes student details

### Item Registration
- [ ] All 10 categories display correctly
- [ ] Dynamic fields show based on category
- [ ] Photo upload works (up to 3 photos)
- [ ] QR code is generated and unique
- [ ] Item appears in user's items list

### Lost Reporting
- [ ] Lost report form validates required fields
- [ ] Item status changes to 'lost' after report
- [ ] Owner receives notification
- [ ] Report appears in lost reports list

### QR Scanning
- [ ] App scan (logged in) shows full details and actions
- [ ] Web scan (not logged in) shows limited info
- [ ] Owner receives notification on scan
- [ ] Scan count increments
- [ ] Scan events are recorded

### Notifications
- [ ] Notifications are created on scan events
- [ ] Real-time notifications work
- [ ] Mark as read works
- [ ] Unread count is accurate

### Chat
- [ ] Chat can be initiated from scan
- [ ] Messages send successfully
- [ ] Real-time messages work
- [ ] Unread message count is accurate
- [ ] Chat threads list shows correctly

## Step 9: Admin Panel Updates

Update your admin panel to manage the students masterlist:

```javascript
// Admin: Add student to masterlist
const { error } = await supabase
  .from('students')
  .insert({
    student_id: '2021-12345',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    email: 'juan.delacruz@university.edu',
    program: 'BSIT',
    year_level: '3rd Year',
    section: 'A',
    status: 'active',
  });

// Admin: View all lost reports
const { data: reports } = await supabase
  .from('lost_reports')
  .select(`
    *,
    item:items(*),
    user:users(*),
    student:students(*)
  `)
  .order('reported_at', { ascending: false });
```

## Step 10: Migration from Old Schema (If Needed)

If you have existing data to migrate:

```sql
-- Example: Migrate existing items to new schema
INSERT INTO items (id, user_id, student_id, name, category, description, photo_urls, status, qr_code, metadata)
SELECT 
  id,
  user_id,
  (SELECT student_id FROM users WHERE users.id = old_items.user_id),
  name,
  category,
  description,
  photo_urls,
  status,
  qr_code,
  metadata
FROM old_items;
```

## Troubleshooting

### Issue: RLS policies blocking queries
**Solution**: Check that user is authenticated and policies match your use case

### Issue: Foreign key constraint violations
**Solution**: Ensure referenced records exist (e.g., student_id exists in students table)

### Issue: QR code generation fails
**Solution**: Check that `generate_qr_code()` function exists and has proper permissions

### Issue: Photos not uploading
**Solution**: Verify storage bucket exists and policies allow uploads

## Next Steps

1. Test thoroughly in development
2. Deploy to staging environment
3. Run user acceptance testing
4. Deploy to production
5. Monitor error logs and user feedback

## Support

For issues or questions:
- Check Supabase logs in Dashboard → Logs
- Review RLS policies in Dashboard → Authentication → Policies
- Test queries in SQL Editor
- Check browser console for client-side errors
