# LF.things - Complete Code Documentation Index

**Comprehensive Guide to Every Folder, File, Function, and Implementation**

---

## Documentation Structure

This code documentation is split into multiple files for easier navigation:

### 📄 Main Documents

1. **CODE_DOCUMENTATION.md** - Part 1
   - Project structure overview
   - Root configuration files
   - App folder screens (authentication, home, register)
   - UI components and flows

2. **CODE_DOCUMENTATION_PART2.md** - Part 2
   - Lib folder (core business logic)
   - Supabase clients
   - AI matching algorithm
   - Audit logging system
   - Category forms
   - CTU constants
   - Styles and design system
   - Reusable components

3. **COMPREHENSIVE_GUIDE.md** - Feature Documentation
   - High-level feature descriptions
   - Flowcharts and workflows
   - Database schema
   - Deployment guide

4. **PRESENTATION_DEFENSE.md** - Defense Guide
   - Presentation structure
   - Q&A preparation
   - Visual aids strategy
   - Key talking points

---

## Quick Reference by Topic

### 🔐 Authentication & User Management
- **File**: `app/index.js`
- **Functions**: `handleSignIn()`, `handleSignUp()`
- **Database**: `students`, `profiles`, `auth.users`
- **Features**: Student ID verification, Terms & Conditions

### 🏠 Home Dashboard
- **File**: `app/(tabs)/home.js`
- **Functions**: `fetchUserData()`, `fetchStats()`, `openLostModal()`
- **Features**: Personalized greeting, Quick actions, Statistics

### 📝 Item Registration
- **File**: `app/(tabs)/register.js`
- **Functions**: `pickImage()`, `uploadPhoto()`, `handleRegister()`
- **Features**: Category selection, Photo upload, QR generation

### 🔍 Found Item Reporting
- **File**: `app/(tabs)/report-found.js`
- **Functions**: `pickImage()`, `uploadPhoto()`, `handleSubmit()`
- **Features**: Category selection, AI matching trigger

### 🤖 AI Matching
- **File**: `lib/aiMatching.js`
- **Function**: `findMatches(foundItem, lostItems)`
- **Technology**: Google Gemini AI
- **Algorithm**: Multi-criteria scoring (category, color, brand, description)

### 📊 Admin Panel
- **Files**: `app/admin/*.js`
- **Features**: Dashboard, User management, Student management, Custody log, Audit viewer

### 🎨 Design System
- **Files**: `styles/colors.js`, `styles/theme.js`
- **Exports**: Color palette, Typography scale, Spacing system, Component styles

### 🗄️ Database
- **Files**: `migration.sql`, `admin-schema.sql`
- **Tables**: 11 core tables (students, profiles, items, found_items, ai_matches, etc.)
- **Security**: Row Level Security (RLS) policies

---

## File Organization

### App Screens (app/)

#### Root Level
- `index.js` - Authentication screen
- `auth.js` - Alternative auth screen
- `_layout.js` - Root layout with auth provider
- `qr-scanner.js` - QR code scanner
- `account-settings.js` - Profile edit screen

#### Tab Navigation (app/(tabs)/)
- `_layout.js` - Tab navigator configuration
- `home.js` - Home dashboard
- `register.js` - Item registration
- `report-found.js` - Report found items
- `my-items.js` - User's items list
- `notifications.js` - Notifications feed
- `chat.js` - Chat list
- `profile.js` - User profile

#### Admin Screens (app/admin/)
- `_layout.js` - Admin layout with auth check
- `index.js` - Admin dashboard
- `users.js` - User management
- `students.js` - Student master list
- `items.js` - All items overview
- `custody.js` - Physical custody log
- `audit.js` - Audit log viewer

#### Dynamic Routes
- `app/chat/[thread_id].js` - Individual chat
- `app/found/[id].js` - Found item details
- `app/found/[id]/action.js` - Match review
- `app/item/[id].js` - Item details
- `app/scan/[token].js` - QR scan result

### Utility Functions (lib/)
- `supabase.js` - Supabase client
- `supabaseAdmin.js` - Admin client (service role)
- `aiMatching.js` - AI matching algorithm
- `auditLog.js` - Audit logging utilities
- `categoryForms.js` - Dynamic form fields
- `ctuConstants.js` - CTU-specific constants

### Styling (styles/)
- `colors.js` - Color palette
- `theme.js` - Design system (typography, spacing, components)

### Components (components/)
- `SplashScreen.js` - App loading screen

---

## Key Functions Reference

### Authentication
```javascript
// Sign in
handleSignIn() → supabase.auth.signInWithPassword()

// Sign up
handleSignUp() → 
  1. Verify student ID
  2. Create auth account
  3. Link to student record
  4. Create profile
```

### Item Management
```javascript
// Register item
handleRegister() →
  1. Validate inputs
  2. Upload photos
  3. Insert to items table
  4. Generate QR code

// Mark as lost
markItemAsLost(item) →
  1. Update status to 'lost'
  2. Refresh stats
  3. Show confirmation
```

### AI Matching
```javascript
// Find matches
findMatches(foundItem, lostItems) →
  1. For each lost item:
     a. Build comparison prompt
     b. Call Gemini AI
     c. Parse JSON response
     d. Check threshold (70+)
  2. Sort by score
  3. Return matches
```

### Audit Logging
```javascript
// Log event
logAuditEvent(action, details, userId) →
  1. Get current user
  2. Get IP and user agent
  3. Insert to audit_log table
```

---

## Database Schema Quick Reference

### Core Tables

**students** - Master list of enrolled students
- `student_id` (unique) - Student ID (e.g., "21-12345")
- `full_name` - Student's full name
- `email` - Email address
- `program` - Academic program
- `status` - active | inactive | graduated
- `auth_user_id` - Link to auth.users

**profiles** - User profile information
- `id` (PK) - References auth.users
- `display_name` - User's display name
- `bio` - User bio (max 120 chars)
- `avatar_seed` - Avatar identifier

**items** - Registered items
- `user_id` - Owner's auth user ID
- `name` - Item name
- `category` - Item category
- `photo_urls` - Array of photo URLs
- `qr_token` - Unique QR code token
- `status` - safe | lost | found

**found_items** - Reported found items
- `reporter_id` - User who found the item
- `category` - Item category
- `photo_url` - Photo of found item
- `found_location` - Where it was found
- `status` - pending | matched | claimed

**ai_matches** - AI-generated matches
- `lost_item_id` - References items
- `found_item_id` - References found_items
- `match_score` - Confidence score (0-100)
- `match_details` - AI reasoning and breakdown
- `status` - pending | confirmed | rejected

---

## Common Patterns

### Data Fetching
```javascript
// Basic query
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// With joins
const { data } = await supabase
  .from('items')
  .select(`
    *,
    owner:profiles(display_name)
  `)
  .eq('user_id', userId);
```

### Real-time Subscriptions
```javascript
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'items',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Handle change
    fetchData();
  })
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

### Photo Upload
```javascript
// 1. Pick image
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
});

// 2. Upload to storage
const response = await fetch(result.assets[0].uri);
const blob = await response.blob();
const { data, error } = await supabase.storage
  .from('item-photos')
  .upload(fileName, blob, { contentType: blob.type });

// 3. Get public URL
const { data: urlData } = supabase.storage
  .from('item-photos')
  .getPublicUrl(fileName);
```

---

## Environment Variables

Required in `.env` file:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

---

## Development Commands

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web

# Clear cache
npx expo start --clear
```

---

## Testing Checklist

### Authentication
- [ ] Sign up with valid student ID
- [ ] Sign up with invalid student ID
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong credentials
- [ ] Terms & Conditions acceptance

### Item Registration
- [ ] Select category
- [ ] Upload photos (1-3)
- [ ] Fill required fields
- [ ] Submit form
- [ ] View generated QR code

### Found Item Reporting
- [ ] Select category
- [ ] Upload photo
- [ ] Fill details
- [ ] Submit report
- [ ] Verify AI matching triggered

### AI Matching
- [ ] Report found item
- [ ] Verify matches created
- [ ] Check notification sent
- [ ] Review match details
- [ ] Confirm/reject match

### Admin Panel
- [ ] Access admin dashboard
- [ ] View all users
- [ ] Manage students
- [ ] View custody log
- [ ] Export audit logs

---

## Troubleshooting

### Common Issues

**Photo upload fails**
- Check storage bucket exists
- Verify RLS policies
- Check file size limits

**AI matching not working**
- Verify Gemini API key
- Check API quota
- Review error logs

**Real-time not updating**
- Check subscription setup
- Verify RLS policies
- Test connection

**Authentication errors**
- Verify student ID format
- Check student status
- Review auth policies

---

## Next Steps

For detailed implementation of specific features, refer to:
- **CODE_DOCUMENTATION.md** - Screen implementations
- **CODE_DOCUMENTATION_PART2.md** - Core logic
- **COMPREHENSIVE_GUIDE.md** - Feature workflows
- **PRESENTATION_DEFENSE.md** - Defense preparation

---

**Last Updated**: April 18, 2026  
**Maintained by**: LF.things Development Team

