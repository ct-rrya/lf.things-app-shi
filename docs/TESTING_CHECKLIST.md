# LF.things - Complete Testing Checklist

**Pre-Defense Interface Testing Guide**

---

## 🎯 Testing Strategy

Test in this order:
1. **Critical Path** (must work for demo)
2. **Core Features** (main functionality)
3. **Edge Cases** (error handling)
4. **Admin Features** (if demonstrating)

**Estimated Time**: 45-60 minutes for complete testing

---

## ✅ Critical Path Testing (MUST WORK)

### 1. Authentication Flow (5 minutes)

#### Sign Up - New User
- [ ] Open app, see splash screen (2 seconds)
- [ ] Switch to "Sign Up" tab
- [ ] Enter valid Student ID (e.g., "21-12345")
- [ ] Enter email (e.g., "test@student.ctu.edu")
- [ ] Enter password (min 6 characters)
- [ ] Click Terms & Conditions checkbox
- [ ] Read Terms modal (scroll through)
- [ ] Accept terms
- [ ] Click "CREATE ACCOUNT"
- [ ] See success message
- [ ] Automatically switch to "Sign In" tab

**Expected Result**: Account created, profile linked to student record

#### Sign In - Existing User
- [ ] Enter email
- [ ] Enter password
- [ ] Click "SIGN IN"
- [ ] Navigate to Home screen
- [ ] See personalized greeting with your name

**Expected Result**: Successful login, home dashboard loads

#### Error Cases to Test
- [ ] Sign up with non-existent Student ID → "Not in the System" error
- [ ] Sign up with already registered Student ID → "Already Registered" error
- [ ] Sign in with wrong password → "Incorrect email or password" error
- [ ] Sign up without accepting terms → "Please accept Terms & Conditions" alert

---

### 2. Item Registration (10 minutes)

#### Register Your First Item
- [ ] From Home, tap "Register Item" or go to Register tab
- [ ] See category selection grid (10 categories)
- [ ] Select a category (e.g., "Bottle")
- [ ] See "Step 1 of 2" indicator
- [ ] Click "Continue with Bottle"
- [ ] Navigate to Step 2 (Details Form)
- [ ] See "Step 2 of 2" indicator

#### Fill Item Details
- [ ] Enter item name (e.g., "My Blue Water Bottle")
- [ ] Tap "Add Photo" button
- [ ] Select photo from gallery
- [ ] See photo uploading indicator
- [ ] Photo appears in preview
- [ ] Fill required fields:
  - [ ] Color (e.g., "Blue")
  - [ ] Brand (optional, e.g., "Hydro Flask")
- [ ] Fill owner information:
  - [ ] Full Name (auto-filled or enter)
  - [ ] Program (e.g., "BSIT")
  - [ ] Year & Section (e.g., "3rd Year - Section A")
- [ ] Scroll down to submit button
- [ ] Click "REGISTER & GENERATE QR"
- [ ] See success alert
- [ ] Click "View QR Code"
- [ ] See item detail page with QR code

**Expected Result**: Item registered, QR code generated, visible in My Items

#### Test Multiple Photos
- [ ] Register another item
- [ ] Add 3 photos (maximum)
- [ ] Try to add 4th photo → "Maximum Photos" alert
- [ ] Remove one photo (tap X button)
- [ ] Add another photo
- [ ] Complete registration

**Expected Result**: Photo limit enforced, removal works

---

### 3. Home Dashboard (5 minutes)

#### Verify Dashboard Elements
- [ ] See personalized greeting (e.g., "Hello, John 👋")
- [ ] See "Good Morning/Afternoon/Evening" based on time
- [ ] See Quick Actions section:
  - [ ] "I Lost Something" button
  - [ ] "I Found Something" button
  - [ ] "Scan QR Code" button
- [ ] See Summary cards:
  - [ ] Lost Items count (should be 0)
  - [ ] Safe Items count (should match registered items)

#### Test Quick Actions
- [ ] Tap "I Lost Something"
- [ ] See modal with your registered items
- [ ] Cancel modal
- [ ] Tap "I Found Something"
- [ ] Navigate to Report Found screen
- [ ] Go back to Home
- [ ] Tap "Scan QR Code"
- [ ] See camera permission request (if first time)
- [ ] Grant permission
- [ ] See QR scanner interface

**Expected Result**: All buttons navigate correctly, stats are accurate

---

### 4. My Items Management (5 minutes)

#### View Your Items
- [ ] Go to "My Items" tab
- [ ] See all registered items
- [ ] See "All" tab selected by default
- [ ] Tap on an item card
- [ ] See item detail page
- [ ] See QR code displayed
- [ ] See all item information

#### Mark Item as Lost
- [ ] From Home, tap "I Lost Something"
- [ ] Select an item from the list
- [ ] Confirm marking as lost
- [ ] See success message
- [ ] Go to My Items
- [ ] Switch to "Lost" tab
- [ ] See the item in Lost section
- [ ] Verify Lost count increased on Home

**Expected Result**: Item status changes, appears in correct tab

#### Filter by Status
- [ ] In My Items, tap "All" tab → see all items
- [ ] Tap "Safe" tab → see only safe items
- [ ] Tap "Lost" tab → see only lost items
- [ ] Tap "Found" tab → see found items (if any)

**Expected Result**: Filtering works correctly

---

### 5. Report Found Item (10 minutes)

#### Report a Found Item
- [ ] Go to Home or tap "I Found Something"
- [ ] Navigate to Report Found screen
- [ ] See AI banner explaining matching
- [ ] Select category (e.g., "Bottle")
- [ ] Automatically go to Step 2
- [ ] Tap photo upload area
- [ ] Select photo from gallery
- [ ] See photo preview
- [ ] Fill required fields:
  - [ ] Color
  - [ ] Brand (if applicable)
- [ ] Select location from list
- [ ] If "Other", enter custom location
- [ ] Add additional details (optional)
- [ ] Click "REPORT FOUND ITEM"
- [ ] See processing indicator
- [ ] See success message with match count
- [ ] Click "Done"

**Expected Result**: Found item reported, AI matching triggered

#### Verify AI Matching (if lost item exists)
- [ ] If you have a lost item that matches:
  - [ ] Go to Notifications tab
  - [ ] See "Possible Match Found!" notification
  - [ ] Tap notification
  - [ ] See match details
  - [ ] See AI confidence score
  - [ ] See reasoning

**Expected Result**: Notification created, match details visible

---

### 6. QR Code Scanning (5 minutes)

#### Scan Your Own QR Code
- [ ] Go to My Items
- [ ] Tap an item to view details
- [ ] Take screenshot of QR code OR
- [ ] Print QR code (if possible)
- [ ] Go to Home
- [ ] Tap "Scan QR Code"
- [ ] Point camera at QR code
- [ ] See QR detected
- [ ] Navigate to scan result page
- [ ] See item details
- [ ] See owner information
- [ ] See contact options

**Expected Result**: QR code scans successfully, shows item info

#### Test Invalid QR Code
- [ ] Scan a random QR code (not from app)
- [ ] See "Invalid QR" alert OR
- [ ] See "Item not found" message

**Expected Result**: Invalid QR codes handled gracefully

---

## 🔧 Core Features Testing (20 minutes)

### 7. Profile & Settings (5 minutes)

#### View Profile
- [ ] Go to Profile tab
- [ ] See your display name
- [ ] See student information
- [ ] See statistics (items registered, etc.)

#### Edit Profile
- [ ] Tap "Account Settings"
- [ ] Change display name
- [ ] Add/edit bio (max 120 characters)
- [ ] Try to exceed 120 characters → prevented
- [ ] Select different avatar
- [ ] Save changes
- [ ] Go back to Profile
- [ ] Verify changes applied

**Expected Result**: Profile updates successfully

#### Sign Out
- [ ] In Profile, tap "Sign Out"
- [ ] Confirm sign out
- [ ] Return to auth screen
- [ ] Sign back in
- [ ] Verify session restored

**Expected Result**: Sign out works, can sign back in

---

### 8. Notifications (5 minutes)

#### View Notifications
- [ ] Go to Notifications tab
- [ ] See list of notifications (if any)
- [ ] Tap a notification
- [ ] Navigate to relevant screen
- [ ] Go back to Notifications
- [ ] Mark notification as read (if feature exists)

#### Test Notification Types
- [ ] Match notification → navigates to match details
- [ ] QR scan notification → navigates to item
- [ ] Message notification → navigates to chat

**Expected Result**: All notification types work

---

### 9. Match Review & Confirmation (5 minutes)

#### Review a Match (if available)
- [ ] Go to Notifications
- [ ] Tap a match notification
- [ ] See found item details
- [ ] See your lost item details
- [ ] See AI confidence score
- [ ] See AI reasoning
- [ ] Compare photos

#### Confirm Match
- [ ] Tap "Confirm Match" button
- [ ] See confirmation dialog
- [ ] Confirm
- [ ] See success message
- [ ] Verify chat thread created
- [ ] Navigate to chat

**Expected Result**: Match confirmed, chat initiated

#### Reject Match
- [ ] Review another match
- [ ] Tap "Reject" or "Not My Item"
- [ ] See confirmation
- [ ] Confirm rejection
- [ ] Match removed from list

**Expected Result**: Match rejected, removed from view

---

### 10. Chat/Messaging (5 minutes)

#### Send Messages
- [ ] Go to Chat tab
- [ ] See list of chat threads (if any)
- [ ] Tap a chat thread
- [ ] See conversation history
- [ ] Type a message
- [ ] Send message
- [ ] See message appear
- [ ] See timestamp

#### Real-time Updates (if testing with 2 devices)
- [ ] Send message from Device A
- [ ] See message appear on Device B
- [ ] Reply from Device B
- [ ] See reply on Device A

**Expected Result**: Messages send and receive correctly

---

## 🔴 Edge Cases & Error Handling (10 minutes)

### 11. Network & Connectivity

#### Offline Behavior
- [ ] Turn off WiFi/Data
- [ ] Try to register item → see error
- [ ] Try to load items → see error or cached data
- [ ] Turn on WiFi/Data
- [ ] Retry operation → works

**Expected Result**: Graceful error messages, retry works

#### Slow Connection
- [ ] Use slow network (if possible)
- [ ] Upload photo → see loading indicator
- [ ] Wait for completion
- [ ] Verify upload successful

**Expected Result**: Loading states visible, operations complete

---

### 12. Input Validation

#### Test Invalid Inputs
- [ ] Registration: Leave required fields empty → error
- [ ] Registration: Try to submit without photo → error
- [ ] Sign up: Invalid email format → error
- [ ] Sign up: Password < 6 characters → error
- [ ] Profile: Bio > 120 characters → prevented

**Expected Result**: All validation works

#### Test Special Characters
- [ ] Enter item name with emojis → works
- [ ] Enter description with special characters → works
- [ ] Enter very long text → truncated or scrollable

**Expected Result**: Special characters handled

---

### 13. Photo Upload Edge Cases

#### Test Photo Scenarios
- [ ] Upload very large photo → compressed
- [ ] Upload multiple photos quickly → all upload
- [ ] Cancel photo selection → no error
- [ ] Remove photo after upload → removed
- [ ] Upload same photo twice → both appear

**Expected Result**: All photo operations work

---

## 👨‍💼 Admin Features Testing (10 minutes)

### 14. Admin Dashboard (if you have admin access)

#### Access Admin Panel
- [ ] Sign in with admin account
- [ ] See admin menu option
- [ ] Navigate to Admin Dashboard
- [ ] See statistics:
  - [ ] Total users
  - [ ] Total items
  - [ ] Lost items
  - [ ] Items in custody

**Expected Result**: Admin dashboard loads with stats

---

### 15. Student Management

#### View Students
- [ ] Go to Admin → Students
- [ ] See list of all students
- [ ] Search for a student
- [ ] Filter by status

#### Add Student
- [ ] Click "Add Student"
- [ ] Fill student details:
  - [ ] Student ID (format: YY-NNNNN)
  - [ ] Full Name
  - [ ] Email
  - [ ] Program
  - [ ] Year Level
- [ ] Submit
- [ ] See student in list

#### Edit Student
- [ ] Click on a student
- [ ] Edit information
- [ ] Save changes
- [ ] Verify changes applied

**Expected Result**: CRUD operations work

---

### 16. Custody Log

#### Log Custody Event
- [ ] Go to Admin → Custody
- [ ] Click "Add Entry"
- [ ] Select item
- [ ] Select action (Received/Claimed/Returned)
- [ ] Enter handler name
- [ ] Add notes
- [ ] Submit
- [ ] See entry in log

**Expected Result**: Custody events logged

---

### 17. Audit Log

#### View Audit Trail
- [ ] Go to Admin → Audit
- [ ] See list of all actions
- [ ] Filter by:
  - [ ] User
  - [ ] Action type
  - [ ] Date range
- [ ] Export audit log (if feature exists)

**Expected Result**: All actions logged and visible

---

## 📱 Cross-Platform Testing (if applicable)

### 18. Web Version

- [ ] Open app in web browser
- [ ] Test all critical path features
- [ ] Verify responsive design
- [ ] Test on different screen sizes

### 19. Mobile Devices

- [ ] Test on Android device
- [ ] Test on iOS device (if available)
- [ ] Verify camera permissions
- [ ] Test photo upload from camera
- [ ] Test notifications

---

## 🎬 Demo Preparation Checklist

### Before Your Defense

#### Data Preparation
- [ ] Create 2-3 test accounts with different student IDs
- [ ] Register 5-10 sample items with photos
- [ ] Mark 2-3 items as lost
- [ ] Report 2-3 found items
- [ ] Generate some AI matches
- [ ] Create sample chat conversations
- [ ] Add students to master list (if admin)

#### Device Preparation
- [ ] Charge device to 100%
- [ ] Clear notifications
- [ ] Close other apps
- [ ] Enable "Do Not Disturb" mode
- [ ] Test internet connection
- [ ] Have backup device ready
- [ ] Print sample QR codes

#### Account Preparation
- [ ] Know your login credentials
- [ ] Have admin credentials ready (if needed)
- [ ] Test accounts work
- [ ] Verify all data visible

---

## 🐛 Common Issues & Fixes

### Issue: Photos not uploading
**Fix**: Check Supabase storage bucket exists and RLS policies are correct

### Issue: AI matching not working
**Fix**: Verify Gemini API key is valid and has quota

### Issue: Real-time updates not working
**Fix**: Check Supabase real-time is enabled for your project

### Issue: QR scanner not opening
**Fix**: Grant camera permissions in device settings

### Issue: Login fails
**Fix**: Verify student ID exists in students table with status 'active'

### Issue: Admin panel not accessible
**Fix**: Verify user_id exists in admins table

---

## ✨ Demo Flow Recommendation

**For a 10-minute demo, show this sequence:**

1. **Sign In** (30 seconds)
   - Show existing account login

2. **Home Dashboard** (1 minute)
   - Show personalized greeting
   - Explain quick actions
   - Show statistics

3. **Register Item** (2 minutes)
   - Select category
   - Upload photo
   - Fill details
   - Generate QR code

4. **QR Scanning** (1 minute)
   - Scan the QR code you just created
   - Show item details

5. **Report Found** (2 minutes)
   - Report a found item
   - Show AI matching in action
   - Show match notification

6. **Match Review** (1 minute)
   - Review the AI match
   - Show confidence score
   - Confirm match

7. **My Items** (1 minute)
   - Show all registered items
   - Mark item as lost
   - Show status change

8. **Admin Panel** (1.5 minutes) - if time permits
   - Show dashboard stats
   - Show audit log
   - Show custody tracking

---

## 📊 Testing Results Template

Use this to track your testing:

```
Date: _______________
Tester: _______________
Device: _______________
OS Version: _______________

Critical Path: ✅ / ❌
Core Features: ✅ / ❌
Edge Cases: ✅ / ❌
Admin Features: ✅ / ❌

Issues Found:
1. _______________________________
2. _______________________________
3. _______________________________

Notes:
_________________________________
_________________________________
```

---

**Good luck with your defense!** 🎓

Test everything at least once before the presentation. Focus on the critical path first, then test other features if time permits.

