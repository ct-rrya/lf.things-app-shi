# LF.things - Complete Code Documentation

**Comprehensive Guide to Every Folder, File, Function, and Implementation**

---

## Table of Contents

1. [Project Structure Overview](#project-structure-overview)
2. [Root Files](#root-files)
3. [App Folder - Screens](#app-folder---screens)
4. [Lib Folder - Utilities](#lib-folder---utilities)
5. [Styles Folder - Design System](#styles-folder---design-system)
6. [Components Folder](#components-folder)
7. [Database Schema Files](#database-schema-files)
8. [Configuration Files](#configuration-files)

---

## Project Structure Overview

```
lf-app/
├── app/                    # Application screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   ├── admin/             # Admin-only screens
│   ├── chat/              # Chat screens
│   ├── found/             # Found item screens
│   ├── item/              # Item detail screens
│   ├── scan/              # QR scan result screens
│   └── *.js               # Root-level screens
├── lib/                    # Utility functions and helpers
├── styles/                 # Theme and styling
├── components/             # Reusable UI components
├── docs/                   # Documentation
├── android/                # Android native code
└── Configuration files
```

---

## Root Files

### package.json
**Purpose**: Defines project dependencies and scripts

**Key Dependencies**:
- `expo`: ^55.0.5 - Expo framework
- `react-native`: 0.83.2 - React Native core
- `@supabase/supabase-js`: ^2.98.0 - Backend client
- `@google/generative-ai`: ^0.24.1 - AI matching
- `nativewind`: ^4.2.2 - Styling
- `react-native-qrcode-svg`: ^6.3.21 - QR generation

**Scripts**:
```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

### app.config.js
**Purpose**: Expo configuration

**Key Settings**:
- App name: "LF.things"
- Bundle identifier: `com.lf.app`
- Permissions: Camera, Media Library, Notifications
- Splash screen configuration
- Icon and adaptive icon paths



---

## App Folder - Screens

### app/index.js - Authentication Screen

**Purpose**: Landing page with sign in/sign up functionality

**State Variables**:
```javascript
- mode: 'login' | 'signup' - Current form mode
- studentId: string - Student ID input
- email: string - Email input
- password: string - Password input
- showPassword: boolean - Toggle password visibility
- loading: boolean - Form submission state
- showSplash: boolean - Splash screen visibility
- showTerms: boolean - Terms modal visibility
- termsAccepted: boolean - Terms acceptance state
```

**Key Functions**:

#### `handleSignIn()`
```javascript
async function handleSignIn()
```
- Validates email and password inputs
- Calls `supabase.auth.signInWithPassword()`
- Navigates to home on success
- Shows error alert on failure

**Flow**:
1. Validate inputs (email, password not empty)
2. Set loading state
3. Call Supabase auth
4. Navigate to `/(tabs)/home` on success
5. Show error alert on failure

#### `handleSignUp()`
```javascript
async function handleSignUp()
```
- Validates student ID against master list
- Creates auth account
- Links account to student record
- Creates user profile

**Flow**:
1. Check terms accepted
2. Validate all inputs
3. Query `students` table for student ID
4. Verify student status is 'active'
5. Check if student already has account
6. Create auth account via `supabase.auth.signUp()`
7. Update student record with `auth_user_id`
8. Create profile with display name
9. Show success message

**Database Operations**:
```javascript
// 1. Lookup student
const { data: student } = await supabase
  .from('students')
  .select('id, status, auth_user_id')
  .eq('student_id', studentId.trim())
  .maybeSingle();

// 2. Create auth account
const { data } = await supabase.auth.signUp({
  email: email.trim(),
  password,
});

// 3. Link to student
await supabase
  .from('students')
  .update({ auth_user_id: data.user.id })
  .eq('student_id', studentId.trim());

// 4. Create profile
await supabase
  .from('profiles')
  .upsert({
    id: data.user.id,
    display_name: studentData.full_name,
    avatar_seed: studentId.trim(),
  });
```

**UI Components**:
- Mode tabs (Sign In / Sign Up)
- Student ID input (signup only)
- Email input
- Password input with visibility toggle
- Submit button
- Terms & Conditions modal
- Terms checkbox

**Styling Highlights**:
- Purple gradient header (`colors.grape`)
- Cream form card (`#F2EAD0`)
- Gold accents (`colors.gold`)
- Responsive design for web/tablet



### app/(tabs)/home.js - Home Dashboard

**Purpose**: Main dashboard showing user stats and quick actions

**State Variables**:
```javascript
- userName: string - User's first name
- stats: { lost, matches, safe } - Item statistics
- recentActivity: array - Recent match notifications
- loading: boolean - Data loading state
- showLostModal: boolean - Lost item picker modal
- userItems: array - User's items for marking as lost
- markingLost: string | null - ID of item being marked
```

**Key Functions**:

#### `fetchUserData()`
```javascript
async function fetchUserData()
```
- Fetches user's display name from multiple sources
- Priority: profiles → user_metadata → students → email

**Flow**:
1. Get current user from auth
2. Check `profiles` table for `display_name`
3. Fall back to `user.user_metadata.name`
4. Fall back to `students.full_name`
5. Last resort: use email username
6. Extract first name using `extractFirstName()`

#### `extractFirstName(fullName)`
```javascript
function extractFirstName(fullName)
```
- Handles Filipino naming convention
- Format: "SURNAME FIRSTNAME MIDDLEINITIAL"
- Returns title-cased first name

**Logic**:
```javascript
// If all caps, assume SURNAME FIRSTNAME format
if (fullName === fullName.toUpperCase()) {
  firstName = parts[1]; // Second word is first name
} else {
  firstName = parts[0]; // Normal format
}
// Convert to Title Case
return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
```

#### `fetchStats()`
```javascript
async function fetchStats()
```
- Calculates user's item statistics
- Counts lost, safe items
- Counts pending matches

**Database Queries**:
```javascript
// 1. Get user's items
const { data: ownedItems } = await supabase
  .from('items')
  .select('id, status')
  .eq('user_id', user.id);

// 2. Count by status
const lostCount = ownedItems.filter(i => i.status === 'lost').length;
const safeCount = ownedItems.filter(i => i.status === 'safe').length;

// 3. Count pending matches
const { count } = await supabase
  .from('ai_matches')
  .select('*', { count: 'exact', head: true })
  .in('lost_item_id', itemIds)
  .eq('status', 'pending');
```

#### `fetchRecentActivity()`
```javascript
async function fetchRecentActivity()
```
- Fetches recent AI matches for user's items
- Formats as activity feed

**Query**:
```javascript
const { data: matches } = await supabase
  .from('ai_matches')
  .select(`
    *,
    lost_item:items!ai_matches_lost_item_id_fkey(id, name),
    found_item:found_items(id, category)
  `)
  .in('lost_item_id', itemIds)
  .order('created_at', { ascending: false })
  .limit(5);
```

#### `openLostModal()`
```javascript
async function openLostModal()
```
- Opens modal to mark item as lost
- Fetches user's non-lost items
- Redirects to register if no items

**Flow**:
1. Fetch user's items where status != 'lost'
2. If no items, show alert with option to register
3. Otherwise, show item picker modal

#### `markItemAsLost(item)`
```javascript
async function markItemAsLost(item)
```
- Updates item status to 'lost'
- Refreshes stats
- Shows confirmation

**Database Operation**:
```javascript
await supabase
  .from('items')
  .update({ status: 'lost' })
  .eq('id', item.id);
```

**Real-time Subscriptions**:
```javascript
// Items changes
supabase
  .channel('home_items_rt')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'items',
    filter: `user_id=eq.${user.id}`,
  }, () => { fetchStats(); fetchRecentActivity(); })
  .subscribe();

// Matches changes
supabase
  .channel('home_matches_rt')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ai_matches',
  }, () => { fetchStats(); fetchRecentActivity(); })
  .subscribe();
```

**UI Components**:
- Personalized greeting header
- Quick action buttons:
  - I Lost Something (opens modal)
  - I Found Something (navigates to report)
  - Scan QR Code (opens scanner)
- Summary cards (Lost, Safe counts)
- Lost item picker modal

**Helper Functions**:

#### `getGreeting()`
```javascript
function getGreeting()
```
- Returns time-based greeting
- Morning (< 12), Afternoon (< 17), Evening

#### `formatTime(dateString)`
```javascript
function formatTime(dateString)
```
- Formats timestamp as relative time
- "Just now", "5m ago", "2h ago", "3d ago"



### app/(tabs)/register.js - Item Registration

**Purpose**: Register new items with QR codes

**State Variables**:
```javascript
- step: 1 | 2 - Current registration step
- category: object - Selected category
- selectedCategory: object - Temp selection
- name: string - Item name
- formData: object - Dynamic category fields
- description: string - Item description
- ownerName: string - Owner's full name
- program: string - Academic program
- yearSection: string - Year and section
- contactPhone: string - Phone number (optional)
- address: string - Address (optional)
- socialMedia: string - Social media (optional)
- photos: array - Uploaded photos [{uri, url}]
- uploadingPhoto: boolean - Photo upload state
- photoError: string - Photo upload error
- loading: boolean - Form submission state
```

**Key Functions**:

#### `pickImage()`
```javascript
async function pickImage()
```
- Opens image picker
- Limits to 3 photos
- Uploads selected photo

**Flow**:
1. Check photo limit (max 3)
2. Request media library permissions
3. Launch image picker with options:
   - mediaTypes: ['images']
   - allowsEditing: true
   - aspect: [4, 3]
   - quality: 0.8
4. Call `uploadPhoto()` if image selected

#### `uploadPhoto(asset)`
```javascript
async function uploadPhoto(asset)
```
- Uploads photo to Supabase Storage
- Returns public URL

**Implementation**:
```javascript
async function uploadPhoto(asset) {
  setUploadingPhoto(true);
  try {
    // 1. Fetch image as blob
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    
    // 2. Get MIME type
    const mimeType = blob.type || 'image/jpeg';
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
    
    // 3. Generate unique filename
    const fileName = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    // 4. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('item-photos')
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false,
      });
    
    // 5. Get public URL
    const { data: urlData } = supabase.storage
      .from('item-photos')
      .getPublicUrl(fileName);
    
    // 6. Add to photos array
    setPhotos([...photos, { uri: asset.uri, url: urlData.publicUrl }]);
  } catch (error) {
    setPhotoError(error.message);
    Alert.alert('Upload Failed', 'Could not upload photo');
  } finally {
    setUploadingPhoto(false);
  }
}
```

#### `removePhoto(index)`
```javascript
function removePhoto(index)
```
- Removes photo from array
- Clears error message

#### `handleRegister()`
```javascript
async function handleRegister()
```
- Validates all inputs
- Uploads item to database
- Navigates to item detail

**Validation**:
```javascript
// 1. Check required fields
if (!name.trim()) { Alert.alert('Error', 'Please enter an item name'); return; }
if (photos.length === 0) { Alert.alert('Photo Required', 'Please add at least one photo'); return; }
if (!ownerName.trim()) { Alert.alert('Error', 'Please enter your full name'); return; }
if (!program.trim() || !yearSection.trim()) { Alert.alert('Error', 'Please enter program and year/section'); return; }

// 2. Check category-specific required fields
const fields = getCategoryFields(category.id);
const requiredFields = fields.filter(f => f.required);
const missingFields = requiredFields.filter(f => !formData[f.name]?.trim());
if (missingFields.length > 0) {
  Alert.alert('Missing Information', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
  return;
}
```

**Database Insert**:
```javascript
const { data, error } = await supabase
  .from('items')
  .insert([{
    user_id: user.id,
    name: name.trim(),
    category: category.id,
    ...formData, // Dynamic category fields
    description: description.trim() || null,
    owner_name: ownerName.trim(),
    program: program.trim(),
    year_section: yearSection.trim(),
    contact_phone: contactPhone.trim() || null,
    address: address.trim() || null,
    social_media: socialMedia.trim() || null,
    photo_urls: photoUrls,
    status: 'safe',
  }])
  .select()
  .single();
```

**UI Flow**:

**Step 1: Category Selection**
- Grid of category cards (3 columns)
- Icons for each category
- Selected state with checkmark
- Continue button (disabled until selection)

**Step 2: Details Form**
- Two-column layout on web
- Left column: Item details
  - Item name input
  - Photo upload (up to 3)
  - Dynamic category fields
  - Description textarea
- Right column: Owner information
  - Full name
  - Program
  - Year & Section
  - Contact phone (optional)
  - Address (optional)
  - Social media (optional)
- Submit button

**Category Icons**:
```javascript
const CATEGORY_ICONS = {
  'id': 'card-outline',
  'keys': 'key-outline',
  'laptop': 'laptop-outline',
  'phone': 'phone-portrait-outline',
  'bottle': 'water-outline',
  'wallet': 'wallet-outline',
  'bag': 'bag-outline',
  'watch': 'time-outline',
  'headphones': 'headset-outline',
  'oth