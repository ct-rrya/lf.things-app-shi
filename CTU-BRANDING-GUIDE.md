# CTU Daanbantayan Branding Implementation Guide

This guide documents all CTU Daanbantayan-specific customizations made to the SOS Lost & Found app.

## Overview

The app has been customized exclusively for CTU Daanbantayan students with:
- Student ID-based authentication
- Campus-specific locations
- CTU branding throughout
- Admin office integration

## 1. Authentication & Registration

### Student ID Validation
- **Format**: `XX-XXXXX` (e.g., `21-12345`)
- **Validation**: Regex pattern `/^\d{2}-\d{4,5}$/`
- **Location**: `lib/ctuConstants.js`

### Registration Fields
Required fields for new users:
- Student ID Number (primary identifier)
- Full Name
- Email (for notifications only)
- Password
- Program (dropdown)
- Year Level (dropdown)
- Section (optional text input)

### Programs Available
- BSIT
- BSED
- BSCRIM
- BSA
- BSHM
- BSBA
- Others

### Year Levels
- 1st Year
- 2nd Year
- 3rd Year
- 4th Year

## 2. Campus Locations

All location inputs use a dropdown with these CTU Daanbantayan locations:
- Library
- Canteen
- Gymnasium
- Computer Laboratory 1
- Computer Laboratory 2
- Classroom Building A
- Classroom Building B
- Admin Building
- Parking Area
- Chapel
- Other (shows text input for custom location)

**Implementation**: `lib/ctuConstants.js` → `CTU_LOCATIONS`

## 3. Branding Elements

### Login/Register Screen
- CTU logo at top (placeholder icon currently)
- Tagline: "CTU Daanbantayan — Lost & Found System"
- Subtitle: "For CTU Daanbantayan Students Only"

### Profile Screen
Student information displayed under avatar:
```
Juan Dela Cruz
21-12345
BSIT 3rd Year · 3A
✅ CTU Daanbantayan Student
```

### About Section (Profile)
- App: SOS — Lost & Found
- Campus: CTU Daanbantayan
- For: CTU Daanbantayan Students Only
- Version: v1.0.0

## 4. Turn in to Admin Office Feature

### Finder Action Options
When someone finds an item, they can choose:
1. **I have it with me** - Finder keeps item temporarily
2. **Turn in to Admin Office** ⭐ NEW - Bring to Student Affairs Office
3. **I left it where I found it** - Item remains at location
4. **Contact owner directly** - Open anonymous chat

### Admin Office Details
- **Office**: Student Affairs Office
- **Hours**: Monday to Friday, 8:00 AM - 5:00 PM
- **Status**: Items marked as `at_admin` in database

### Notification Message
When item is turned in to admin:
> "Your [item name] has been turned in to the CTU Daanbantayan Student Affairs Office. Please claim it during office hours."

## 5. Splash Screen

Displays for 2 seconds on app launch:
- CTU logo (school icon placeholder)
- "SOS.things" branding
- "Lost & Found" subtitle
- "CTU Daanbantayan Campus" badge
- Background: #F5F0E8

## 6. Database Schema Updates

### Profiles Table
New columns added:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS section TEXT;
```

### Items Table
Updated status enum:
```sql
status TEXT CHECK (status IN ('safe', 'lost', 'found', 'recovered', 'at_admin'))
```

## 7. Files Modified

### Core Files
- `app/auth.js` - Student ID validation, CTU branding
- `app/(tabs)/register.js` - Location dropdown
- `app/(tabs)/report-found.js` - Location dropdown
- `app/(tabs)/profile.js` - Student info display, About section
- `app/found/[id]/action.js` - Admin office option
- `app/index.js` - Splash screen integration

### New Files
- `lib/ctuConstants.js` - All CTU-specific constants
- `components/SplashScreen.js` - Splash screen component
- `ctu-branding-schema.sql` - Database updates

## 8. Constants Reference

All CTU-specific constants are centralized in `lib/ctuConstants.js`:

```javascript
export const CTU_LOCATIONS = [...];
export const CTU_PROGRAMS = [...];
export const CTU_YEAR_LEVELS = [...];
export const STUDENT_ID_REGEX = /^\d{2}-\d{4,5}$/;
export const CTU_INFO = {
  name: 'CTU Daanbantayan',
  fullName: 'Cebu Technological University - Daanbantayan Campus',
  tagline: 'CTU Daanbantayan — Lost & Found System',
  adminOffice: 'Student Affairs Office',
  officeHours: 'Monday to Friday, 8:00 AM - 5:00 PM',
};
```

## 9. Testing Checklist

- [ ] Student ID validation works (accepts `21-12345`, rejects invalid formats)
- [ ] Registration requires all CTU fields
- [ ] Profile displays student ID, program, year, section
- [ ] Location dropdowns show CTU locations
- [ ] "Turn in to Admin Office" option appears in finder actions
- [ ] Splash screen shows for 2 seconds on launch
- [ ] About section shows CTU information

## 10. Future Enhancements

Potential additions:
- Replace placeholder logo with actual CTU Daanbantaran logo
- Add CTU color scheme customization
- Integrate with CTU student database for ID verification
- Add department-specific locations
- Multi-language support (English/Cebuano)

## Support

For issues or questions about CTU-specific features, refer to:
- `TROUBLESHOOTING.md` - General app issues
- `DATABASE-SETUP.md` - Database configuration
- This guide - CTU-specific customizations
