# CTU Daanbantayan Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Setup
- [ ] Run `ctu-branding-schema.sql` in Supabase SQL Editor
- [ ] Verify `profiles` table has new columns:
  - [ ] `student_id` (TEXT, UNIQUE)
  - [ ] `year_level` (TEXT)
  - [ ] `section` (TEXT)
- [ ] Verify `items` table status includes `at_admin`
- [ ] Test `handle_new_user()` function works

### 2. Environment Configuration
- [ ] `.env` file has correct Supabase credentials
- [ ] Supabase URL is correct
- [ ] Supabase Anon Key is correct
- [ ] Storage bucket `item-photos` exists

### 3. Code Verification
- [ ] All files compile without errors
- [ ] No TypeScript/JavaScript errors
- [ ] All imports resolve correctly
- [ ] `lib/ctuConstants.js` exists and exports correctly

### 4. Feature Testing

#### Authentication
- [ ] Can register with valid Student ID (e.g., `21-12345`)
- [ ] Invalid Student IDs are rejected
- [ ] All registration fields are required
- [ ] Program dropdown shows CTU programs
- [ ] Year level dropdown works
- [ ] Section field is optional
- [ ] Password validation works (min 6 chars)
- [ ] Can login after registration

#### Profile Display
- [ ] Profile shows full name
- [ ] Student ID displays correctly
- [ ] Program and year level show
- [ ] Section shows if provided
- [ ] "CTU Daanbantayan Student" badge appears
- [ ] About section shows CTU information

#### Location Dropdowns
- [ ] Report Found form has location dropdown
- [ ] All CTU locations appear
- [ ] "Other" option shows text input
- [ ] Selected location saves correctly

#### Admin Office Feature
- [ ] "Turn in to Admin Office" option appears
- [ ] Selecting it updates item status to `at_admin`
- [ ] Notification message mentions Student Affairs Office
- [ ] Office hours are displayed

#### Splash Screen
- [ ] Splash screen appears on app launch
- [ ] Shows for approximately 2 seconds
- [ ] CTU branding is visible
- [ ] Transitions smoothly to login/home

### 5. Visual Verification
- [ ] CTU logo/icon appears on login screen
- [ ] Tagline "CTU Daanbantaran — Lost & Found System" shows
- [ ] "For CTU Daanbantayan Students Only" text visible
- [ ] Colors match CTU branding (if customized)
- [ ] All text is readable and properly formatted

## 🚀 Deployment Steps

### Step 1: Database Migration
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create New Query
4. Copy contents of ctu-branding-schema.sql
5. Paste and Run
6. Verify success message
```

### Step 2: Test Locally
```bash
cd sos-app
npm install  # If needed
npm start
# or
npx expo start
```

### Step 3: Test Registration Flow
```
1. Launch app
2. Wait for splash screen
3. Click "Sign Up"
4. Enter test Student ID: 21-12345
5. Fill all fields
6. Create account
7. Verify profile shows student info
```

### Step 4: Test Core Features
```
1. Register an item
   - Select category
   - Add photo
   - Choose CTU location
   - Verify QR code generated

2. Report found item
   - Select category
   - Add photo
   - Choose CTU location
   - Verify submission

3. Test finder actions
   - Scan/view item
   - Verify "Turn in to Admin" option
   - Test selection
```

### Step 5: Production Build
```bash
# For Android
eas build --platform android

# For iOS
eas build --platform ios

# For Web
npm run build
```

## 📋 Post-Deployment Verification

### Day 1 Checks
- [ ] First student can register successfully
- [ ] Student ID validation works in production
- [ ] Profile data saves correctly
- [ ] Location dropdowns work
- [ ] Admin office option appears
- [ ] Notifications send correctly

### Week 1 Monitoring
- [ ] Monitor registration errors
- [ ] Check for invalid Student ID attempts
- [ ] Verify location data is clean
- [ ] Track admin office submissions
- [ ] Review user feedback

## 🔧 Configuration Options

### Customize Student ID Format
If CTU uses different format, edit `lib/ctuConstants.js`:
```javascript
export const STUDENT_ID_REGEX = /^\d{2}-\d{4,5}$/;
// Change to match actual format
```

### Add/Remove Locations
Edit `lib/ctuConstants.js`:
```javascript
export const CTU_LOCATIONS = [
  'Library',
  'Your New Location',
  // Add or remove as needed
];
```

### Update Programs
Edit `lib/ctuConstants.js`:
```javascript
export const CTU_PROGRAMS = [
  'BSIT',
  'Your New Program',
  // Add or remove as needed
];
```

### Change Office Information
Edit `lib/ctuConstants.js`:
```javascript
export const CTU_INFO = {
  adminOffice: 'Student Affairs Office',
  officeHours: 'Monday to Friday, 8:00 AM - 5:00 PM',
};
```

### Add Real CTU Logo
1. Save logo as `assets/images/ctu-logo.png`
2. Update `components/SplashScreen.js`:
```javascript
<Image 
  source={require('../assets/images/ctu-logo.png')} 
  style={{ width: 80, height: 80 }}
/>
```
3. Update `app/auth.js` logo section similarly

## 🐛 Common Issues & Solutions

### Issue: "Student ID already exists"
**Solution**: Each Student ID can only register once. Use different email or reset in database.

### Issue: Location dropdown not showing
**Solution**: 
1. Check `lib/ctuConstants.js` is imported
2. Verify `CTU_LOCATIONS` array exists
3. Clear cache and restart

### Issue: Profile not showing student info
**Solution**:
1. Verify database migration ran successfully
2. Check `profiles` table has new columns
3. Re-register test user

### Issue: "Turn in to Admin" not appearing
**Solution**:
1. Check `app/found/[id]/action.js` has `turned_in_admin`
2. Verify database has `at_admin` in status enum
3. Clear app cache

### Issue: Splash screen not showing
**Solution**:
1. Check `components/SplashScreen.js` exists
2. Verify import in `app/index.js`
3. Check useState and useEffect logic

## 📞 Support Resources

### Documentation
- `CTU-BRANDING-GUIDE.md` - Complete feature guide
- `CTU-IMPLEMENTATION-SUMMARY.md` - What was changed
- `CTU-FEATURES-OVERVIEW.md` - Visual overview
- `CTU-QUICK-START.md` - Quick reference
- `TROUBLESHOOTING.md` - General app issues

### Key Files
- `lib/ctuConstants.js` - All CTU constants
- `ctu-branding-schema.sql` - Database migration
- `app/auth.js` - Registration logic
- `app/(tabs)/profile.js` - Profile display
- `components/SplashScreen.js` - Splash screen

## ✨ Success Criteria

Your deployment is successful when:
- ✅ Students can register with valid Student IDs
- ✅ Invalid Student IDs are rejected
- ✅ Profile shows complete student information
- ✅ Location dropdowns work throughout app
- ✅ "Turn in to Admin Office" option functions
- ✅ Splash screen displays on launch
- ✅ CTU branding is visible everywhere
- ✅ All core features work as expected

## 🎓 Ready for CTU Daanbantayan!

Once all checklist items are complete, your SOS Lost & Found system is ready to serve CTU Daanbantayan students! 🎉

---

**Last Updated**: Implementation Complete
**Version**: 1.0.0
**Campus**: CTU Daanbantayan
