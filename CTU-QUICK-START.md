# CTU Daanbantayan Quick Start Guide

## 🚀 Getting Started

### 1. Database Setup (Required First!)

Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- Copy and paste the entire contents of ctu-branding-schema.sql
-- This adds student_id, year_level, section columns and at_admin status
```

### 2. Start the App

```bash
cd sos-app
npm start
# or
npx expo start
```

### 3. Test Registration

Try registering with these test credentials:
- **Student ID**: `21-12345` ✅ (valid format)
- **Full Name**: Juan Dela Cruz
- **Email**: juan@test.com
- **Program**: BSIT
- **Year Level**: 3rd Year
- **Section**: 3A
- **Password**: test123

Invalid Student IDs to test validation:
- `2112345` ❌ (missing dash)
- `21-123` ❌ (too short)
- `ABC-12345` ❌ (letters instead of numbers)

## 📋 Key Features

### For Students
1. **Register Items** - Get QR codes for your belongings
2. **Report Lost** - Mark items as lost, AI finds matches
3. **Report Found** - Help return items to owners
4. **Scan QR Codes** - Find owner info when you find an item

### For Finders
When you scan a QR code, you can:
- 📋 Keep it with you
- 🏫 **Turn in to Admin Office** (NEW!)
- 📍 Leave it where you found it
- 💬 Contact owner anonymously

### CTU-Specific Features
- ✅ Student ID validation (XX-XXXXX format)
- ✅ Campus location dropdowns
- ✅ Student Affairs Office integration
- ✅ CTU branding throughout

## 🎯 Common Tasks

### Update Student ID Format
If CTU uses a different ID format, edit `lib/ctuConstants.js`:
```javascript
export const STUDENT_ID_REGEX = /^\d{2}-\d{4,5}$/; // Change this
```

### Add/Remove Locations
Edit `lib/ctuConstants.js`:
```javascript
export const CTU_LOCATIONS = [
  'Library',
  'Your New Location', // Add here
  // ...
];
```

### Change Admin Office Info
Edit `lib/ctuConstants.js`:
```javascript
export const CTU_INFO = {
  adminOffice: 'Student Affairs Office',
  officeHours: 'Monday to Friday, 8:00 AM - 5:00 PM',
};
```

### Add CTU Logo
1. Save logo as `assets/images/ctu-logo.png`
2. Update `components/SplashScreen.js`:
```javascript
import { Image } from 'react-native';
// Replace the Ionicons with:
<Image 
  source={require('../assets/images/ctu-logo.png')} 
  style={{ width: 80, height: 80 }}
/>
```

## 🔍 Testing Checklist

- [ ] Splash screen appears for 2 seconds
- [ ] Can register with valid Student ID
- [ ] Invalid Student IDs show error
- [ ] Profile shows: Name, Student ID, Program, Year, Section
- [ ] Location dropdowns work in found/lost reports
- [ ] "Turn in to Admin Office" option appears
- [ ] About section shows CTU information

## 📱 User Flow

### New Student Registration
1. Launch app → See splash screen (2 sec)
2. Click "Sign Up"
3. Enter Student ID (validated)
4. Fill in name, email, program, year, section
5. Create password
6. Account created!

### Registering an Item
1. Go to "Register" tab
2. Select category (ID, Keys, Laptop, etc.)
3. Add photo
4. Fill in details
5. Select last seen location (CTU dropdown)
6. Get QR code!

### Reporting Found Item
1. Go to "Report Found" tab
2. Select category
3. Add photo
4. Select location where found (CTU dropdown)
5. AI matches with lost items
6. Owner gets notified!

### Finder Actions (After Scanning QR)
1. Scan QR code
2. See item details
3. Choose action:
   - Keep it → Owner notified
   - **Turn in to Admin** → Bring to Student Affairs
   - Left it there → Specify location
   - Contact owner → Open chat

## 🆘 Troubleshooting

### "Student ID already exists"
- Each Student ID can only register once
- Use a different email or contact admin

### Location dropdown not showing
- Check `lib/ctuConstants.js` is imported
- Verify `CTU_LOCATIONS` array exists

### Profile not showing student info
- Run database migration (`ctu-branding-schema.sql`)
- Check profile has `student_id`, `year_level`, `section` columns

### "Turn in to Admin" not appearing
- Check `app/found/[id]/action.js` has `turned_in_admin` option
- Verify database has `at_admin` status in items table

## 📚 Documentation

- `CTU-BRANDING-GUIDE.md` - Complete feature documentation
- `CTU-IMPLEMENTATION-SUMMARY.md` - What was changed
- `DATABASE-SETUP.md` - Database configuration
- `TROUBLESHOOTING.md` - Common issues

## 🎓 CTU Daanbantayan Specific

**Campus**: Cebu Technological University - Daanbantayan Campus
**System**: Lost & Found Management System
**For**: CTU Daanbantayan Students Only
**Admin**: Student Affairs Office (Mon-Fri, 8AM-5PM)

---

Need help? Check the documentation files or contact your system administrator.
