# QR Scan Finder Flow

## Overview

When a finder scans a QR code without a registered account, they now have two clear options with proper validation.

---

## Finder Experience

### Step 1: Scan QR Code
Finder scans the QR code on the lost item and sees the item details.

### Step 2: Choose an Option

**Option A: Turn it in to SSG Office**
- Finder selects "I'll turn it in to the Student Affairs Office"
- No contact details required
- Optional: Can add a note
- Item status → `at_admin`

**Option B: I still have it**
- Finder selects "I still have it"
- MUST provide at least ONE contact method:
  - Phone number
  - Facebook profile/username
  - Instagram handle
- Optional: Name and location note
- Item status → `located`

### Step 3: Validation

If finder selects "I still have it" but leaves all contact fields empty:
- ❌ Submission blocked
- Alert shown: "Please provide at least one way for the owner to contact you"

### Step 4: Submit

After successful submission:
- Scan event created in `scan_events` table
- Item status updated
- Owner receives notification

---

## Owner Experience

### Notification Card Display

**If finder chose "Turn it in":**
```
🏢 ITEM FOUND
Your [Item Name] was found!

Finder: [Name] · Anonymous
Status: is turning it in to SSG Office

[View Item] button
```

**If finder chose "I still have it":**
```
📋 ITEM FOUND
Your [Item Name] was found!

Finder: [Name] · Anonymous
Status: has your item with them
Contact: [Phone/Facebook/Instagram]

[View Finder Details] button
```

### CTA Actions

**"View Item" (Turn in scenario):**
- Navigates to item details page

**"View Finder Details" (Have it scenario):**
- Shows alert with:
  - Finder name
  - Phone number (if provided)
  - Facebook (if provided)
  - Instagram (if provided)
  - Location note (if provided)
- Options: "View Item" or "OK"

---

## Database Schema

### scan_events table
```sql
{
  id: uuid,
  item_id: uuid,
  action: 'turn_in' | 'have_it',
  finder_name: text,
  finder_phone: text,
  finder_contact: text (Facebook/Instagram),
  finder_email: text,
  location_note: text,
  finder_user_id: null (anonymous),
  created_at: timestamp
}
```

### Item Status Updates
- `turn_in` → item.status = `at_admin`
- `have_it` → item.status = `located`

---

## Validation Rules

1. **Option selection required**: User must choose either "turn_in" or "have_it"

2. **Contact validation for "have_it"**:
   - At least ONE of: phone, facebook, or instagram must be filled
   - If all empty → show error and block submission

3. **Optional fields**:
   - Finder name (always optional)
   - Location note (always optional)

---

## UI Components

### Option Cards
- Radio button selection
- Icon indicators (business for turn in, hand for have it)
- Expandable info notes when selected

### Contact Form
- Only visible when "have it" is selected
- Icons for each contact method
- Clear labeling of required vs optional

### Submit Button
- Green for "turn in" option
- Grape for "have it" option
- Dynamic text based on selection

---

## Success Messages

**Turn in:**
> "The owner has been notified that their item is being turned in to the SSG Office."

**Have it:**
> "The owner has been notified and will contact you soon using the details you provided."

---

## Files Modified

1. `app/scan/[token].js` - Complete rewrite with two-option flow
2. `app/(tabs)/notifications.js` - Updated to handle `turn_in` action and show proper CTAs

---

## Testing Checklist

- [ ] Scan QR code without account
- [ ] Select "Turn it in" option
- [ ] Submit without contact info (should work)
- [ ] Verify owner sees "Being turned in to SSG Office"
- [ ] Select "I still have it" option
- [ ] Try to submit without contact info (should fail)
- [ ] Add only phone number and submit (should work)
- [ ] Add only Facebook and submit (should work)
- [ ] Add only Instagram and submit (should work)
- [ ] Verify owner sees "View Finder Details" button
- [ ] Click "View Finder Details" and verify contact info shown
- [ ] Verify item status updates correctly
