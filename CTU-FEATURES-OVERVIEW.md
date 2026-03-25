# CTU Daanbantayan Features Overview

## 🎓 What Makes This CTU-Exclusive?

### 1. Student ID Authentication 🆔

**Before**: Anyone could register with just email
**Now**: Only CTU Daanbantayan students with valid Student IDs

```
Registration Form:
┌─────────────────────────────────┐
│ Student ID Number *             │
│ [21-12345]                      │ ← Validated format
│                                 │
│ Full Name *                     │
│ [Juan Dela Cruz]                │
│                                 │
│ Email *                         │
│ [juan@email.com]                │
│                                 │
│ Program *                       │
│ [BSIT] [BSED] [BSCRIM] ...     │ ← CTU programs
│                                 │
│ Year Level *                    │
│ [1st] [2nd] [3rd] [4th]        │
│                                 │
│ Section (optional)              │
│ [3A]                            │
└─────────────────────────────────┘
```

### 2. Campus Location System 📍

**Before**: Free text input for locations
**Now**: Standardized CTU Daanbantayan locations

```
Where did you find it?
┌─────────────────────────────────┐
│ [Library] [Canteen] [Gymnasium] │
│ [Computer Lab 1] [Computer Lab 2]│
│ [Building A] [Building B]       │
│ [Admin] [Parking] [Chapel]      │
│ [Other] ← Shows text input      │
└─────────────────────────────────┘
```

**Used in**:
- Lost item reports (last seen location)
- Found item reports (where found)
- Consistent across the app

### 3. Turn in to Admin Office 🏫

**New Finder Option**: Direct integration with Student Affairs Office

```
What did you do with it?

┌─────────────────────────────────┐
│ 📋 I have it with me            │
│ You're holding the item         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🏫 Turn in to Admin Office      │ ← NEW!
│ Bring to Student Affairs Office │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📍 I left it where I found it   │
│ Couldn't take it with me        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💬 Contact owner directly       │
│ Open anonymous chat             │
└─────────────────────────────────┘
```

**When selected**:
- Item status → `at_admin`
- Owner notified: "Your item is at Student Affairs Office"
- Office hours shown: Mon-Fri, 8AM-5PM

### 4. Student Profile Display 👤

**Profile Screen Shows**:
```
        ┌─────────┐
        │    J    │  ← Avatar with initial
        └─────────┘
    
    Juan Dela Cruz
       21-12345          ← Student ID
   BSIT 3rd Year · 3A   ← Program, Year, Section
   
✅ CTU Daanbantayan Student
```

### 5. CTU Branding Throughout 🎨

**Login/Register Screen**:
```
┌─────────────────────────────────┐
│         🏫 CTU Logo             │
│                                 │
│    LOST & FOUND SYSTEM          │
│                                 │
│      SOS.things                 │
│                                 │
│ CTU Daanbantayan —              │
│ Lost & Found System             │
│                                 │
│ For CTU Daanbantayan            │
│ Students Only                   │
└─────────────────────────────────┘
```

**Splash Screen** (2 seconds):
```
┌─────────────────────────────────┐
│                                 │
│         ┌─────────┐             │
│         │   🏫    │             │
│         └─────────┘             │
│                                 │
│      SOS.things                 │
│     Lost & Found                │
│                                 │
│  ┌───────────────────────┐     │
│  │ CTU Daanbantayan      │     │
│  │ Campus                │     │
│  └───────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

**About Section** (Profile):
```
┌─────────────────────────────────┐
│ ℹ️  About                        │
├─────────────────────────────────┤
│ App:      SOS — Lost & Found    │
│ Campus:   CTU Daanbantayan      │
│ For:      CTU Daanbantayan      │
│           Students Only         │
│ Version:  v1.0.0                │
└─────────────────────────────────┘
```

## 🔄 Complete User Journey

### New Student Onboarding

```
1. Launch App
   ↓
2. Splash Screen (2 sec)
   "CTU Daanbantayan Campus"
   ↓
3. Login/Register Screen
   "For CTU Daanbantayan Students Only"
   ↓
4. Register with Student ID
   21-12345 ✓ Validated
   ↓
5. Select Program & Year
   BSIT, 3rd Year, Section 3A
   ↓
6. Account Created!
   Profile shows all CTU info
```

### Registering an Item

```
1. Register Tab
   ↓
2. Select Category
   (ID, Keys, Laptop, etc.)
   ↓
3. Add Photo
   ↓
4. Fill Details
   ↓
5. Select Location ← CTU Dropdown
   "Computer Laboratory 1"
   ↓
6. QR Code Generated!
```

### Finding a Lost Item

```
1. Someone finds your item
   ↓
2. Scans QR code
   ↓
3. Sees your item details
   ↓
4. Chooses: "Turn in to Admin Office" ← NEW!
   ↓
5. You get notification:
   "Your laptop has been turned in to
    the CTU Daanbantayan Student
    Affairs Office. Please claim it
    during office hours."
   ↓
6. Visit Student Affairs Office
   Mon-Fri, 8AM-5PM
```

## 📊 Data Flow

### Student Registration
```
User Input → Validation → Database
─────────────────────────────────
Student ID  → Regex Check → profiles.student_id
21-12345      ✓ Valid      (unique)

Program     → Dropdown   → profiles.program
BSIT          Selected     

Year Level  → Dropdown   → profiles.year_level
3rd Year      Selected

Section     → Text Input → profiles.section
3A            Optional
```

### Location Tracking
```
Report Type → Location Dropdown → Database Field
────────────────────────────────────────────────
Lost Item   → CTU_LOCATIONS    → items.last_seen_location
Found Item  → CTU_LOCATIONS    → found_items.found_location
```

### Admin Office Status
```
Finder Action → Item Status → Notification
──────────────────────────────────────────
Turn in to    → at_admin   → "Item at Student
Admin Office                  Affairs Office"
```

## 🎯 Key Benefits

### For Students
✅ Secure - Only CTU students can register
✅ Familiar - Uses campus locations you know
✅ Convenient - Admin office integration
✅ Professional - CTU-branded experience

### For Finders
✅ Clear options - Know exactly what to do
✅ Easy handoff - Turn in to admin office
✅ Location-specific - CTU campus locations

### For Administration
✅ Verified users - Student ID validation
✅ Centralized - Admin office as collection point
✅ Trackable - Status updates (at_admin)
✅ Campus-specific - CTU locations only

## 🔐 Security Features

1. **Student ID Validation**
   - Format enforcement (XX-XXXXX)
   - Unique constraint (one account per ID)
   - Database-level verification

2. **CTU-Only Access**
   - Registration requires valid Student ID
   - Branding reinforces exclusivity
   - Profile verification badge

3. **Location Restrictions**
   - Only CTU campus locations
   - Prevents off-campus confusion
   - Standardized reporting

## 📈 Scalability

### Easy to Customize

**Add New Location**:
```javascript
// lib/ctuConstants.js
export const CTU_LOCATIONS = [
  'Library',
  'New Building', // ← Add here
  // ...
];
```

**Change Student ID Format**:
```javascript
// lib/ctuConstants.js
export const STUDENT_ID_REGEX = /^\d{4}-\d{5}$/; // New format
```

**Update Office Hours**:
```javascript
// lib/ctuConstants.js
export const CTU_INFO = {
  officeHours: 'Monday to Saturday, 7:00 AM - 6:00 PM',
};
```

## 🎓 CTU Daanbantayan Integration

This system is now fully integrated with CTU Daanbantayan:

- ✅ Student ID-based authentication
- ✅ Campus-specific locations
- ✅ Student Affairs Office workflow
- ✅ CTU branding and identity
- ✅ Student profile information
- ✅ Exclusive access control

**Result**: A professional, campus-specific lost and found system that serves CTU Daanbantayan students exclusively! 🎉
