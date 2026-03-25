# Profile Screen Setup Guide

The Profile screen is now fully functional with all features wired up.

## Features Implemented

### 1. User Profile Display
- ✅ Fetches logged-in user data from `supabase.auth.getUser()`
- ✅ Displays actual email
- ✅ Shows first letter of name/email in avatar circle
- ✅ Uses `full_name` from profiles table if available
- ✅ Tap avatar to open Edit Profile modal

### 2. Edit Profile Modal
- ✅ Full Name field
- ✅ Program / Year / Section field
- ✅ Phone Number (optional)
- ✅ Social Media Link (optional)
- ✅ Saves changes to `profiles` table
- ✅ Shows success/error toasts

### 3. Verification Badge
- ✅ Shows "Verified Member" if `email_confirmed_at` exists
- ✅ Shows "Unverified" in grey if email not confirmed
- ✅ Tap "Unverified" to resend verification email via `supabase.auth.resend()`

### 4. Settings Gear Icon
- ✅ Opens App Settings modal with:
  - Dark mode toggle (cosmetic placeholder)
  - Language selector (cosmetic placeholder)
  - Clear Cache button (shows toast)

### 5. My Registered Items
- ✅ Navigates to My Items tab
- ✅ Shows count badge with number of registered items
- ✅ Fetches count from `items` table where `user_id = auth.uid()`

### 6. Notification Settings
- ✅ Opens modal with toggles:
  - Push Notifications
  - SMS Alerts (only shown if phone number saved)
  - Match Alerts
  - Chat Message Alerts
- ✅ Saves preferences to `profiles.notification_settings` as JSON
- ✅ Loads saved preferences on open

### 7. Privacy & Security
- ✅ Opens modal with:
  - QR Code Visibility toggle (saves to `profiles.qr_visible`)
  - Change Password button (sends reset email)
  - Delete Account button (red, with confirmation dialog)
- ✅ Change Password shows success toast
- ✅ Delete Account shows confirmation before deleting

### 8. Sign Out
- ✅ Shows confirmation dialog: "Sign out of SOS things?"
- ✅ Calls `supabase.auth.signOut()` on confirm
- ✅ Redirects to login screen
- ✅ Error handling with toast

### 9. Error Handling
- ✅ Save profile fails → Toast: "Failed to save. Please try again."
- ✅ Password reset fails → Toast: "Could not send reset email."
- ✅ Sign out fails → Toast: "Sign out failed. Please try again."
- ✅ All errors logged to console

## Database Setup

### Run the profiles schema SQL

Execute `profiles-schema.sql` in your Supabase SQL editor:

```bash
# The file creates:
# - profiles table with all required fields
# - RLS policies for user access
# - Trigger to auto-create profile on signup
# - Indexes for performance
```

### Table Structure

```sql
profiles (
  id                    UUID references auth.users(id) primary key,
  full_name             TEXT,
  program               TEXT,
  phone                 TEXT,
  social_link           TEXT,
  avatar_url            TEXT,
  qr_visible            BOOLEAN default true,
  notification_settings JSONB default '{
    "push": true,
    "sms": true,
    "matches": true,
    "chat": true
  }',
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
)
```

## Testing Checklist

- [ ] Profile loads with user email
- [ ] Avatar shows correct initial
- [ ] Verification badge shows correct status
- [ ] Tap avatar opens Edit Profile modal
- [ ] Edit profile saves successfully
- [ ] Settings gear opens App Settings
- [ ] My Registered Items shows correct count
- [ ] Notification Settings saves preferences
- [ ] Privacy & Security toggles work
- [ ] Change Password sends reset email
- [ ] Delete Account shows confirmation
- [ ] Sign Out shows confirmation and works
- [ ] All toasts display correctly
- [ ] Error handling works for network issues

## Notes

- Profile is auto-created on user signup via database trigger
- All modals use bottom sheet style for mobile UX
- Settings are saved immediately or on "Save" button press
- Toast messages work on both Android (ToastAndroid) and iOS (Alert)
- The settings gear icon is positioned in the top left of the header
- Item count badge only shows if count > 0
- SMS Alerts toggle only shows if user has phone number saved
