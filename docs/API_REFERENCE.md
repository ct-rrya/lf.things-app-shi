# API Reference - Complete Redesign

Quick reference for all service functions in the redesigned Lost & Found app.

## Authentication Service (`lib/authService.js`)

### `signUpWithValidation(params)`
Creates new user account with student masterlist validation.

```javascript
const result = await signUpWithValidation({
  studentId: '2021-12345',
  email: 'student@university.edu',
  password: 'password123',
  phoneNumber: '09171234567', // optional
});

// Returns: { success, user, session, student, error }
```

### `loginWithEmailOrStudentId(params)`
Login with email OR student ID.

```javascript
const result = await loginWithEmailOrStudentId({
  identifier: '2021-12345', // or email
  password: 'password123',
});

// Returns: { success, user, session, profile, error }
```

### `getCurrentUserProfile()`
Get current user profile with student details.

```javascript
const result = await getCurrentUserProfile();
// Returns: { success, profile, error }
```

### `logout()`
Sign out current user.

```javascript
const result = await logout();
// Returns: { success, error }
```

---

## Item Service (`lib/itemService.js`)

### `ITEM_CATEGORIES`
Object containing all category definitions with dynamic fields.

```javascript
const categories = ITEM_CATEGORIES;
// Keys: id, keys, laptop, phone, bottle, wallet, bag, watch, headphones, other
```

### `registerItem(params)`
Register new item with QR code generation.

```javascript
const result = await registerItem({
  userId: 'uuid',
  studentId: '2021-12345',
  name: 'My Blue Laptop',
  category: 'laptop',
  description: 'Dell laptop with sticker',
  photoUrls: ['url1', 'url2'],
  metadata: { brand: 'Dell', model: 'XPS 13', color: 'Blue' },
});

// Returns: { success, item, error }
```

### `getUserItems(userId)`
Get all items for a user.

```javascript
const result = await getUserItems(userId);
// Returns: { success, items, error }
```

### `getItemById(itemId)`
Get item details with user and student info.

```javascript
const result = await getItemById(itemId);
// Returns: { success, item, error }
```

### `getItemByQRCode(qrCode)`
Get item by QR code (for scanning).

```javascript
const result = await getItemByQRCode('ABC123XYZ');
// Returns: { success, item, error }
```

### `updateItem(itemId, updates)`
Update item details.

```javascript
const result = await updateItem(itemId, {
  name: 'Updated Name',
  status: 'safe',
});

// Returns: { success, item, error }
```

### `deleteItem(itemId)`
Delete an item.

```javascript
const result = await deleteItem(itemId);
// Returns: { success, error }
```

### `uploadItemPhotos(itemId, photos)`
Upload up to 3 photos for an item.

```javascript
const result = await uploadItemPhotos(itemId, [
  { uri: 'file://...', type: 'image/jpeg' },
]);

// Returns: { success, urls, error }
```

---

## Lost Report Service (`lib/lostReportService.js`)

### `createLostReport(params)`
Create formal lost item report.

```javascript
const result = await createLostReport({
  itemId: 'uuid',
  userId: 'uuid',
  lastSeenLocation: 'Library 3rd Floor',
  lastSeenDate: '2026-04-20',
  circumstances: 'Left it on the table while getting coffee...',
  notes: 'Please contact me if found',
});

// Returns: { success, report, error }
```

### `getUserLostReports(userId)`
Get all lost reports for a user.

```javascript
const result = await getUserLostReports(userId);
// Returns: { success, reports, error }
```

### `getLostReportById(reportId)`
Get specific lost report details.

```javascript
const result = await getLostReportById(reportId);
// Returns: { success, report, error }
```

### `updateLostReport(reportId, updates)`
Update lost report.

```javascript
const result = await updateLostReport(reportId, {
  status: 'investigating',
  notes: 'Updated information',
});

// Returns: { success, report, error }
```

### `resolveLostReport(reportId, itemId, newItemStatus)`
Mark report as resolved and update item status.

```javascript
const result = await resolveLostReport(reportId, itemId, 'safe');
// Returns: { success, error }
```

### `getAllActiveLostReports()`
Get all active lost reports (admin).

```javascript
const result = await getAllActiveLostReports();
// Returns: { success, reports, error }
```

### `getLostReportStats(userId)`
Get lost report statistics.

```javascript
const result = await getLostReportStats(userId); // or null for all
// Returns: { success, stats: { total, reported, investigating, resolved }, error }
```

---

## Scan Service (`lib/scanService.js`)

### `handleAppScan(qrCode, scannerUserId)`
Handle QR scan from logged-in user.

```javascript
const result = await handleAppScan('ABC123XYZ', userId);
// Returns: { 
//   success, 
//   item, 
//   isOwner, 
//   availableActions: ['return_to_ssg', 'chat_with_owner', 'report_found'],
//   error 
// }
```

### `handleWebScan(qrCode, scannerIp)`
Handle QR scan from web (not logged in).

```javascript
const result = await handleWebScan('ABC123XYZ', '192.168.1.1');
// Returns: { success, item: { limited info }, message, error }
```

### `reportReturnedToSSG(itemId, scannerUserId)`
Mark item as returned to SSG office.

```javascript
const result = await reportReturnedToSSG(itemId, userId);
// Returns: { success, message, error }
```

### `reportItemFound(itemId, scannerUserId, location)`
Report that item was found.

```javascript
const result = await reportItemFound(itemId, userId, 'Cafeteria');
// Returns: { success, message, error }
```

### `getItemScanHistory(itemId)`
Get all scan events for an item.

```javascript
const result = await getItemScanHistory(itemId);
// Returns: { success, scans, error }
```

### `getScanStats(userId)`
Get scan statistics.

```javascript
const result = await getScanStats(userId); // or null for all
// Returns: { 
//   success, 
//   stats: { 
//     total, 
//     by_action: {}, 
//     by_scanner_type: { app, web } 
//   }, 
//   error 
// }
```

---

## Notification Service (`lib/notificationService.js`)

### `createNotification(params)`
Create new notification.

```javascript
const result = await createNotification({
  userId: 'uuid',
  type: 'item_scanned', // or 'item_found', 'item_returned', 'message', 'system'
  title: 'Your Item Was Scanned',
  body: 'Someone scanned your QR code',
  data: { item_id: 'uuid' },
});

// Returns: { success, notification, error }
```

### `getUserNotifications(userId, limit)`
Get user's notifications.

```javascript
const result = await getUserNotifications(userId, 50);
// Returns: { success, notifications, error }
```

### `markNotificationAsRead(notificationId)`
Mark single notification as read.

```javascript
const result = await markNotificationAsRead(notificationId);
// Returns: { success, error }
```

### `markAllNotificationsAsRead(userId)`
Mark all notifications as read.

```javascript
const result = await markAllNotificationsAsRead(userId);
// Returns: { success, error }
```

### `deleteNotification(notificationId)`
Delete a notification.

```javascript
const result = await deleteNotification(notificationId);
// Returns: { success, error }
```

### `getUnreadNotificationCount(userId)`
Get count of unread notifications.

```javascript
const result = await getUnreadNotificationCount(userId);
// Returns: { success, count, error }
```

### `subscribeToNotifications(userId, callback)`
Subscribe to real-time notifications.

```javascript
const unsubscribe = subscribeToNotifications(userId, (notification) => {
  console.log('New notification:', notification);
});

// Cleanup
return () => unsubscribe();
```

### `requestPushPermissions()`
Request push notification permissions.

```javascript
const result = await requestPushPermissions();
// Returns: { success, token, error }
```

---

## Chat Service (`lib/chatService.js`)

### `sendMessage(params)`
Send chat message.

```javascript
const result = await sendMessage({
  itemId: 'uuid',
  fromUserId: 'uuid',
  toUserId: 'uuid',
  message: 'I found your item!',
});

// Returns: { success, message, error }
```

### `getChatMessages(itemId, userId)`
Get all messages for an item.

```javascript
const result = await getChatMessages(itemId, userId);
// Returns: { success, messages, error }
```

### `getChatThreads(userId)`
Get all chat threads for user.

```javascript
const result = await getChatThreads(userId);
// Returns: { 
//   success, 
//   threads: [{ 
//     item_id, 
//     item, 
//     other_user, 
//     last_message_at, 
//     has_unread 
//   }], 
//   error 
// }
```

### `markMessagesAsRead(itemId, userId)`
Mark all messages as read for an item.

```javascript
const result = await markMessagesAsRead(itemId, userId);
// Returns: { success, error }
```

### `getUnreadMessageCount(userId)`
Get count of unread messages.

```javascript
const result = await getUnreadMessageCount(userId);
// Returns: { success, count, error }
```

### `subscribeToChatMessages(itemId, userId, callback)`
Subscribe to real-time chat messages.

```javascript
const unsubscribe = subscribeToChatMessages(itemId, userId, (message) => {
  console.log('New message:', message);
});

// Cleanup
return () => unsubscribe();
```

### `startChatWithOwner(itemId, scannerUserId)`
Initiate chat with item owner.

```javascript
const result = await startChatWithOwner(itemId, scannerUserId);
// Returns: { success, item, ownerId, error }
```

### `deleteMessage(messageId, userId)`
Delete own message.

```javascript
const result = await deleteMessage(messageId, userId);
// Returns: { success, error }
```

---

## Database Schema Reference

### Tables

1. **students** - Pre-populated masterlist
2. **users** - Signed up accounts linked to students
3. **items** - Registered items with QR codes
4. **lost_reports** - Formal lost item reports
5. **scan_events** - QR scan tracking
6. **notifications** - Push/email notifications
7. **chat_messages** - In-app messaging

### Item Categories

- `id` - ID/Lanyard
- `keys` - Keys
- `laptop` - Laptop
- `phone` - Phone
- `bottle` - Bottle
- `wallet` - Wallet
- `bag` - Bag
- `watch` - Watch
- `headphones` - Headphones
- `other` - Other

### Item Status Values

- `safe` - Item is with owner
- `lost` - Item is lost (has active report)
- `found` - Item was found by someone
- `claimed` - Item was claimed by owner
- `returned` - Item was returned to owner

### Notification Types

- `item_scanned` - QR code was scanned
- `item_found` - Item was found
- `item_returned` - Item was returned
- `message` - New chat message
- `system` - System notification

### Scan Action Types

- `viewed` - Just viewed item details
- `notified_owner` - Owner was notified
- `returned_to_ssg` - Returned to SSG office
- `chatted` - Started chat with owner
- `reported_found` - Reported item as found

---

## Common Patterns

### Complete Sign Up Flow

```javascript
// 1. Validate and sign up
const signUpResult = await signUpWithValidation({
  studentId: '2021-12345',
  email: 'student@university.edu',
  password: 'password123',
});

if (signUpResult.success) {
  // 2. Get user profile
  const profileResult = await getCurrentUserProfile();
  
  // 3. Request push permissions
  const pushResult = await requestPushPermissions();
  
  // 4. Navigate to home
}
```

### Complete Item Registration Flow

```javascript
// 1. User selects category
// 2. User fills dynamic form
// 3. User uploads photos
// 4. Submit registration

const result = await registerItem({
  userId,
  studentId,
  name: 'My Laptop',
  category: 'laptop',
  description: 'Blue Dell laptop',
  photoUrls: uploadedUrls,
  metadata: { brand: 'Dell', model: 'XPS 13' },
});

// 5. Show QR code for printing
console.log('QR Code:', result.item.qr_code);
```

### Complete QR Scan Flow (App)

```javascript
// 1. Scan QR code
const scanResult = await handleAppScan(qrCode, userId);

if (scanResult.isOwner) {
  // Show owner view
} else {
  // 2. Show finder options
  // User selects action:
  
  // Option A: Return to SSG
  await reportReturnedToSSG(itemId, userId);
  
  // Option B: Chat with owner
  const chatResult = await startChatWithOwner(itemId, userId);
  // Navigate to chat screen
  
  // Option C: Report found
  await reportItemFound(itemId, userId, location);
}
```

### Complete Chat Flow

```javascript
// 1. Start chat
const { item, ownerId } = await startChatWithOwner(itemId, finderId);

// 2. Subscribe to messages
const unsubscribe = subscribeToChatMessages(itemId, currentUserId, (msg) => {
  // Add message to UI
});

// 3. Send message
await sendMessage({
  itemId,
  fromUserId: currentUserId,
  toUserId: otherUserId,
  message: 'I found your item at the library',
});

// 4. Mark as read
await markMessagesAsRead(itemId, currentUserId);

// 5. Cleanup
unsubscribe();
```
