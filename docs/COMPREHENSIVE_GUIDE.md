# LF.things - Comprehensive Developer Guide

## Table of Contents
1. [About the Application](#about-the-application)
2. [Technologies Used](#technologies-used)
3. [Features & Flowcharts](#features--flowcharts)
4. [Folder Structure](#folder-structure)
5. [File Documentation](#file-documentation)
6. [Database Schema](#database-schema)
7. [Deployment](#deployment)

---

## About the Application

**LF.things** is a comprehensive Lost & Found management system designed specifically for CTU Daanbantayan campus. The application helps students:

- Register their personal belongings with unique QR code stickers
- Report found items to help reunite them with owners
- Mark items as lost and receive AI-powered match suggestions
- Communicate with finders/owners through in-app messaging
- Track item custody through the SSG Office

### Key Objectives

1. **Reduce Lost Item Incidents**: By providing QR code tags for personal belongings
2. **Increase Recovery Rate**: Through AI-powered matching between lost and found items
3. **Streamline Communication**: Direct messaging between finders and owners
4. **Maintain Accountability**: Audit logging and custody tracking for admin oversight
5. **Campus-Wide Adoption**: Student ID verification ensures only enrolled students can use the system

### Important Disclaimer

The app is a tool to assist in recovering lost items but does NOT guarantee that lost items will be found or returned. The system relies on community participation. Administrators and staff are NOT responsible for physically searching for or recovering lost belongings.

---

## Technologies Used

### Frontend Framework

**React Native (v0.83.2)** with **Expo (v55.0.5)**
- **Use Case**: Cross-platform mobile and web application development
- **Why**: Single codebase for iOS, Android, and Web deployment
- **Key Features Used**:
  - Expo Router for file-based navigation
  - Expo Camera for QR code scanning
  - Expo Image Picker for photo uploads
  - Expo Notifications for push notifications

### Backend & Database

**Supabase (@supabase/supabase-js v2.98.0)**
- **Use Case**: Backend-as-a-Service (BaaS) providing authentication, database, and real-time subscriptions
- **Why**: Rapid development with built-in auth, PostgreSQL database, and real-time capabilities
- **Features Used**:
  - Authentication (email/password with student ID verification)
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions for live updates
  - Storage for item photos

### AI Integration

**Google Generative AI (@google/generative-ai v0.24.1)**
- **Use Case**: AI-powered matching between lost and found items
- **Why**: Intelligent matching based on descriptions, categories, and visual features
- **Implementation**: Analyzes item descriptions and photos to suggest potential matches

### UI & Styling

**NativeWind (v4.2.2)** + **TailwindCSS (v3.4.19)**
- **Use Case**: Utility-first CSS styling for React Native
- **Why**: Consistent styling across platforms with familiar Tailwind syntax
- **Custom Theme**: Located in `styles/theme.js` and `styles/colors.js`

### QR Code Generation & Scanning

**react-native-qrcode-svg (v6.3.21)** + **Expo Camera**
- **Use Case**: Generate QR codes for registered items and scan them to identify owners
- **Why**: Native QR code functionality without external dependencies
- **Implementation**: Each registered item gets a unique QR code with a token

### State Management & Data Flow

**React Hooks** + **Supabase Real-time**
- **Use Case**: Local state management with real-time database synchronization
- **Why**: Simple, built-in React solution with automatic UI updates
- **Pattern**: useState for local state, useEffect for data fetching, Supabase channels for real-time

---

## Features & Flowcharts

### 1. Authentication Flow
**File**: `docs/graphviz/01-authentication.dot`


**Description**: Users sign up with their Student ID, which must exist in the pre-registered students master list. Upon successful verification, an auth account is created and linked to their student record.

**Key Steps**:
1. User enters Student ID, email, and password
2. System verifies Student ID exists in `students` table
3. Checks if student status is 'active'
4. Creates auth account via Supabase Auth
5. Links auth_user_id to student record
6. Creates profile with display name and avatar

**Code Location**: `app/index.js` (handleSignUp function)

---

### 2. Item Registration Flow
**File**: `docs/graphviz/02-item-registration.dot`

**Description**: Students register their personal belongings by providing details and photos. The system generates a unique QR code that can be printed as a sticker.

**Key Steps**:
1. User fills out item details (name, category, description, color, brand)
2. Uploads photos of the item
3. System generates unique token
4. Creates QR code with token
5. Saves item to database with status 'safe'
6. User can download/print QR code sticker

**Code Location**: `app/(tabs)/register.js`

---

### 3. QR Code Scanning Flow
**File**: `docs/graphviz/03-qr-scanning.dot`

**Description**: Anyone who finds an item with a QR code can scan it to identify the owner and initiate contact.

**Key Steps**:
1. User opens QR scanner
2. Scans QR code on item
3. System decodes token and looks up item
4. Displays item details and owner info
5. Provides options to contact owner or mark as found

**Code Location**: `app/qr-scanner.js`, `app/scan/[token].js`


---

### 4. Report Found Item Flow
**File**: `docs/graphviz/04-report-found.dot`

**Description**: Users can report items they've found on campus, providing details and photos to help match with lost items.

**Key Steps**:
1. User selects "I Found Something"
2. Fills out found item details (category, description, location, date)
3. Uploads photos
4. Submits report
5. System triggers AI matching algorithm
6. Creates potential matches with lost items

**Code Location**: `app/(tabs)/report-found.js`

---

### 5. AI Matching System
**File**: `docs/graphviz/05-ai-matching.dot`

**Description**: When a found item is reported, the AI analyzes it against all lost items to find potential matches.

**Key Steps**:
1. Found item is submitted
2. System fetches all lost items
3. AI compares descriptions, categories, colors, brands
4. Generates similarity scores
5. Creates match records for high-confidence matches
6. Sends notifications to potential owners

**Code Location**: `lib/aiMatching.js`

**AI Prompt Strategy**:
- Compares item attributes (category, color, brand, description)
- Analyzes semantic similarity in descriptions
- Returns confidence score (0-100)
- Threshold: 70+ for automatic match creation

---

### 6. Match Review Flow
**File**: `docs/graphviz/06-match-review.dot`

**Description**: Item owners review AI-suggested matches and confirm if it's their item.

**Key Steps**:
1. User receives notification of potential match
2. Views match details with photos
3. Compares found item with their lost item
4. Confirms match or rejects
5. If confirmed, initiates chat with finder
6. Coordinates item return

**Code Location**: `app/found/[id]/action.js`


---

### 7. Chat/Messaging System
**File**: `docs/graphviz/07-chat-messaging.dot`

**Description**: Direct messaging between item owners and finders to coordinate returns.

**Key Steps**:
1. Match is confirmed
2. Chat thread is created
3. Users exchange messages
4. Real-time message delivery via Supabase
5. Coordinate meetup for item return

**Code Location**: `app/chat/[thread_id].js`

---

### 8. My Items Dashboard
**File**: `docs/graphviz/08-my-items.dot`

**Description**: Users view all their registered items, categorized by status (safe, lost, found).

**Key Steps**:
1. Fetch user's items from database
2. Group by status
3. Display with photos and details
4. Allow status updates (mark as lost/found)
5. View QR codes
6. Delete items

**Code Location**: `app/(tabs)/my-items.js`

---

### 9. Notifications System
**File**: `docs/graphviz/09-notifications.dot`

**Description**: Push notifications for important events (matches found, messages received, etc.)

**Key Steps**:
1. Event occurs (match created, message sent)
2. System creates notification record
3. Push notification sent via Expo Notifications
4. User views in notifications tab
5. Tapping notification navigates to relevant screen

**Code Location**: `app/(tabs)/notifications.js`

---

### 10. Admin Dashboard
**File**: `docs/graphviz/10-admin-dashboard.dot`

**Description**: Overview of system statistics and quick access to admin functions.

**Key Features**:
- Total users, items, matches statistics
- Recent activity feed
- Quick actions (manage users, items, students)
- System health indicators

**Code Location**: `app/admin/index.js`


---

### 11. Student Management
**File**: `docs/graphviz/11-student-management.dot`

**Description**: Admins manage the master list of enrolled students who can register accounts.

**Key Features**:
- Add new students (bulk or individual)
- Edit student information
- Deactivate/reactivate students
- View linked auth accounts
- Export student list

**Code Location**: `app/admin/students.js`

---

### 12. Custody Log
**File**: `docs/graphviz/12-custody-log.dot`

**Description**: Track physical items turned in to the SSG Office.

**Key Features**:
- Log item received at office
- Assign shelf/storage location
- Record when item is claimed
- Track who handled the item
- Disposal records for unclaimed items

**Code Location**: `app/admin/custody.js`

---

### 13. Profile & Settings
**File**: `docs/graphviz/13-profile-settings.dot`

**Description**: Users manage their profile information and app preferences.

**Key Features**:
- Edit display name and bio
- Change avatar (20 preset options)
- View account information
- Sign out

**Code Location**: `app/(tabs)/profile.js`, `app/account-settings.js`

---

### 14. Home Dashboard
**File**: `docs/graphviz/14-home-dashboard.dot`

**Description**: Main landing page after login with personalized greeting and quick actions.

**Key Features**:
- Personalized greeting with user's first name
- Quick action buttons (I Lost Something, I Found Something, Scan QR)
- Summary cards (lost items, safe items, pending matches)
- Recent activity feed

**Code Location**: `app/(tabs)/home.js`


---

## Folder Structure

```
lf-app/
├── app/                          # Main application screens (Expo Router)
│   ├── (tabs)/                   # Tab-based navigation screens
│   │   ├── _layout.js           # Tab navigator configuration
│   │   ├── home.js              # Home dashboard
│   │   ├── register.js          # Item registration
│   │   ├── report-found.js      # Report found items
│   │   ├── my-items.js          # User's items list
│   │   ├── notifications.js     # Notifications feed
│   │   ├── chat.js              # Chat list
│   │   └── profile.js           # User profile
│   ├── admin/                    # Admin-only screens
│   │   ├── _layout.js           # Admin layout with auth check
│   │   ├── index.js             # Admin dashboard
│   │   ├── users.js             # User management
│   │   ├── students.js          # Student master list
│   │   ├── items.js             # All items overview
│   │   ├── custody.js           # Physical custody log
│   │   └── audit.js             # Audit log viewer
│   ├── chat/
│   │   └── [thread_id].js       # Individual chat thread
│   ├── found/
│   │   ├── [id].js              # Found item details
│   │   └── [id]/action.js       # Match review actions
│   ├── item/
│   │   └── [id].js              # Item details view
│   ├── scan/
│   │   └── [token].js           # Scanned QR code result
│   ├── _layout.js               # Root layout with auth provider
│   ├── index.js                 # Landing/auth screen
│   ├── auth.js                  # Alternative auth screen
│   ├── account-settings.js      # Profile edit screen
│   └── qr-scanner.js            # QR code scanner
│
├── components/                   # Reusable UI components
│   └── SplashScreen.js          # App loading screen
│
├── lib/                          # Utility functions and helpers
│   ├── supabase.js              # Supabase client configuration
│   ├── supabaseAdmin.js         # Admin client with service role
│   ├── aiMatching.js            # AI matching algorithm
│   ├── auditLog.js              # Audit logging utilities
│   ├── categoryForms.js         # Dynamic form fields per category
│   └── ctuConstants.js          # CTU-specific constants
│
├── styles/                       # Theme and styling
│   ├── theme.js                 # Design system (colors, typography, spacing)
│   └── colors.js                # Color palette
│
├── docs/                         # Documentation
│   ├── graphviz/                # Flowchart source files
│   ├── COMPREHENSIVE_GUIDE.md   # This file
│   ├── AUDIT_LOGGING.md         # Audit system documentation
│   └── ADMIN_AUDIT_SUMMARY.md   # Admin audit features
│
├── android/                      # Android native code
├── .expo/                        # Expo configuration
├── migration.sql                 # Main database schema
├── admin-schema.sql              # Admin-specific tables
├── fix-student-data.sql          # Data migration script
├── app.config.js                 # Expo app configuration
├── package.json                  # Dependencies
└── .env                          # Environment variables
```


---

## File Documentation

### Core Application Files

#### `app/index.js`
**Purpose**: Landing page and authentication screen

**Key Logic**:
- Dual-mode form (Sign In / Sign Up)
- Student ID validation against master list
- Terms & Conditions modal with disclaimer
- Profile creation on signup
- Name formatting (handles "SURNAME FIRSTNAME" format)

**Functions**:
- `handleSignIn()`: Authenticates user with email/password
- `handleSignUp()`: Creates account after student ID verification
- Validates student status is 'active'
- Links auth account to student record
- Creates profile with display_name from students table

---

#### `app/(tabs)/home.js`
**Purpose**: Main dashboard after login

**Key Logic**:
- Personalized greeting with first name extraction
- Real-time stats (lost items, safe items, matches)
- Quick action buttons
- Recent activity feed
- Modal for marking items as lost

**Functions**:
- `fetchUserData()`: Gets user name from profiles → user_metadata → students
- `extractFirstName()`: Handles Filipino naming convention (SURNAME FIRSTNAME)
- `fetchStats()`: Counts items by status and pending matches
- `fetchRecentActivity()`: Gets recent match notifications
- `openLostModal()`: Shows user's items to mark as lost

**Real-time Subscriptions**:
- Items table changes
- AI matches updates
- Profile changes

---

#### `app/(tabs)/register.js`
**Purpose**: Register new items with QR codes

**Key Logic**:
- Category-specific form fields
- Photo upload (multiple images)
- QR code generation with unique token
- Dynamic form based on item category

**Functions**:
- `handleRegister()`: Validates and saves item
- `generateQRCode()`: Creates unique token and QR code
- `uploadPhotos()`: Uploads to Supabase Storage
- Category-specific fields from `lib/categoryForms.js`


---

#### `app/(tabs)/report-found.js`
**Purpose**: Report found items

**Key Logic**:
- Found item form with photos
- Location and date found
- Triggers AI matching on submission
- Optional contact information

**Functions**:
- `handleSubmit()`: Saves found item and triggers matching
- `triggerAIMatching()`: Calls AI matching algorithm
- Photo upload to Supabase Storage

---

#### `app/(tabs)/my-items.js`
**Purpose**: View and manage user's registered items

**Key Logic**:
- Tabs for different statuses (All, Safe, Lost, Found)
- Item cards with photos
- Status update actions
- QR code viewing
- Item deletion

**Functions**:
- `fetchItems()`: Gets user's items filtered by status
- `updateItemStatus()`: Changes item status
- `deleteItem()`: Removes item from database
- Real-time updates when items change

---

#### `app/qr-scanner.js`
**Purpose**: Scan QR codes on items

**Key Logic**:
- Camera permission handling
- QR code detection
- Token extraction and validation
- Navigation to scanned item

**Functions**:
- `handleBarCodeScanned()`: Processes scanned QR code
- Extracts token from QR data
- Navigates to `/scan/[token]`

---

#### `app/scan/[token].js`
**Purpose**: Display scanned item information

**Key Logic**:
- Looks up item by token
- Shows item details and owner info
- Options to contact owner or report as found
- Handles items not found

**Functions**:
- `fetchItemByToken()`: Queries items table
- `contactOwner()`: Initiates chat or shows contact info
- `reportFound()`: Marks item as found


---

#### `app/chat/[thread_id].js`
**Purpose**: Individual chat conversation

**Key Logic**:
- Real-time message updates
- Message sending and receiving
- Participant information
- Auto-scroll to latest message

**Functions**:
- `fetchMessages()`: Gets chat history
- `sendMessage()`: Sends new message
- Real-time subscription to new messages
- `markAsRead()`: Updates read status

---

#### `app/found/[id].js`
**Purpose**: Found item details view

**Key Logic**:
- Displays found item information
- Shows photos
- Lists potential matches
- Actions for match review

**Functions**:
- `fetchFoundItem()`: Gets found item details
- `fetchMatches()`: Gets AI-suggested matches
- Navigation to match review

---

#### `app/found/[id]/action.js`
**Purpose**: Review and confirm matches

**Key Logic**:
- Side-by-side comparison of lost and found items
- Confirm or reject match
- Initiate chat on confirmation
- Update match status

**Functions**:
- `confirmMatch()`: Marks match as confirmed, creates chat
- `rejectMatch()`: Marks match as rejected
- `fetchMatchDetails()`: Gets both items' full details

---

### Library Files

#### `lib/supabase.js`
**Purpose**: Supabase client configuration

**Key Logic**:
- Initializes Supabase client with URL and anon key
- Configures auth persistence
- Sets up storage for auth tokens

**Exports**:
- `supabase`: Main client instance for all database operations


---

#### `lib/supabaseAdmin.js`
**Purpose**: Admin client with elevated permissions

**Key Logic**:
- Uses service role key for admin operations
- Bypasses Row Level Security (RLS)
- Used for admin-only operations

**Exports**:
- `supabaseAdmin`: Admin client instance

**Security Note**: Service role key should NEVER be exposed to client-side code. Only use in server-side functions or admin screens with proper auth checks.

---

#### `lib/aiMatching.js`
**Purpose**: AI-powered matching algorithm

**Key Logic**:
- Uses Google Generative AI (Gemini)
- Compares found items against all lost items
- Generates similarity scores
- Creates match records for high-confidence matches

**Functions**:
- `matchFoundItemWithLost(foundItemId)`: Main matching function
- Fetches found item details
- Queries all lost items
- Sends to AI for comparison
- Parses AI response for match scores
- Creates match records (score >= 70)
- Sends notifications to owners

**AI Prompt Structure**:
```
Compare this found item:
- Category: [category]
- Description: [description]
- Color: [color]
- Brand: [brand]

Against these lost items:
[List of lost items with same structure]

Return JSON array with:
- lost_item_id
- confidence_score (0-100)
- reasoning
```

---

#### `lib/auditLog.js`
**Purpose**: Audit logging utilities

**Key Logic**:
- Logs all admin actions
- Records user actions, timestamps, and details
- Queryable audit trail

**Functions**:
- `logAuditEvent(action, details, userId)`: Creates audit log entry
- `getAuditLogs(filters)`: Retrieves audit logs with filtering

**Logged Actions**:
- User management (create, update, delete)
- Student management (add, edit, deactivate)
- Item status changes
- Match confirmations/rejections
- Admin access to sensitive data


---

#### `lib/categoryForms.js`
**Purpose**: Dynamic form fields based on item category

**Key Logic**:
- Defines category-specific fields
- Provides validation rules
- Customizes form layout per category

**Categories**:
- Electronics (brand, model, serial number)
- Clothing (size, material, pattern)
- Accessories (material, style)
- Books (title, author, ISBN)
- IDs (ID type, ID number)
- Keys (key type, keychain description)
- Bags (brand, size, material)
- Others (generic fields)

**Exports**:
- `getCategoryFields(category)`: Returns field configuration
- `validateCategoryData(category, data)`: Validates form data

---

#### `lib/ctuConstants.js`
**Purpose**: CTU Daanbantayan-specific constants

**Key Data**:
- `CTU_PROGRAMS`: List of available programs (BSIT, BSCS, etc.)
- `CTU_YEAR_LEVELS`: Year level options (1st Year - 4th Year)
- `CTU_INFO`: Campus information (name, tagline)
- `validateStudentId(id)`: Validates student ID format

**Student ID Format**:
- Pattern: `YY-NNNNN` (e.g., "21-12345")
- YY: Year enrolled (2 digits)
- NNNNN: Student number (5 digits)

---

### Admin Files

#### `app/admin/_layout.js`
**Purpose**: Admin layout with authentication check

**Key Logic**:
- Verifies user is admin before rendering
- Checks `admins` table for user_id
- Redirects non-admins to home
- Provides admin navigation

**Functions**:
- `checkAdminStatus()`: Queries admins table
- Redirects if not admin
- Shows loading state during check


---

#### `app/admin/index.js`
**Purpose**: Admin dashboard overview

**Key Features**:
- System statistics (users, items, matches)
- Recent activity feed
- Quick action buttons
- System health indicators

**Functions**:
- `fetchStats()`: Gets counts from all tables
- `fetchRecentActivity()`: Gets recent system events
- Real-time updates for stats

---

#### `app/admin/users.js`
**Purpose**: User management interface

**Key Features**:
- List all registered users
- View user details
- Deactivate/reactivate accounts
- View user's items and activity
- Search and filter users

**Functions**:
- `fetchUsers()`: Gets all users with student info
- `toggleUserStatus()`: Activates/deactivates user
- `viewUserDetails()`: Shows detailed user information
- Audit logging for all actions

---

#### `app/admin/students.js`
**Purpose**: Student master list management

**Key Features**:
- Add new students (individual or bulk)
- Edit student information
- View linked auth accounts
- Import from CSV
- Export student list

**Functions**:
- `addStudent()`: Creates new student record
- `editStudent()`: Updates student information
- `bulkImport()`: Imports multiple students from CSV
- `exportStudents()`: Exports to CSV
- Validation for student ID format

---

#### `app/admin/items.js`
**Purpose**: All items overview

**Key Features**:
- View all items in system
- Filter by status, category, user
- Search items
- View item details
- Update item status
- Delete items

**Functions**:
- `fetchAllItems()`: Gets all items with owner info
- `filterItems()`: Applies filters and search
- `updateItemStatus()`: Changes item status
- `deleteItem()`: Removes item (with confirmation)


---

#### `app/admin/custody.js`
**Purpose**: Physical custody log

**Key Features**:
- Log items received at SSG Office
- Assign shelf/storage location
- Record item claims
- Track handlers
- Disposal records

**Functions**:
- `logCustodyEvent()`: Creates custody log entry
- `fetchCustodyLog()`: Gets custody history
- `updateCustodyStatus()`: Changes custody status
- Actions: received, claimed, disposed, returned

---

#### `app/admin/audit.js`
**Purpose**: Audit log viewer

**Key Features**:
- View all system actions
- Filter by user, action type, date
- Search audit logs
- Export audit trail
- Detailed action information

**Functions**:
- `fetchAuditLogs()`: Gets audit log entries
- `filterLogs()`: Applies filters
- `exportAuditTrail()`: Exports to CSV
- Real-time updates for new entries

---

### Style Files

#### `styles/theme.js`
**Purpose**: Design system configuration

**Exports**:
- `colors`: Color palette
- `typography`: Font styles and sizes
- `spacing`: Consistent spacing scale
- `components`: Reusable component styles

**Design Tokens**:
- Primary: #F5C842 (Gold)
- Danger: #E53935 (Red)
- Success: #10b981 (Green)
- Background: #F5F0E8 (Cream)
- Dark: #1A1611 (Almost Black)

---

#### `styles/colors.js`
**Purpose**: Color palette definitions

**Color System**:
- `gold`: #F5C842 (Primary accent)
- `ember`: #E53935 (Danger/alerts)
- `success`: #10b981 (Success states)
- `grape`: #45354B (Dark purple)
- `custard`: #DECF9D (Light cream)
- `muted`: #8A8070 (Text secondary)


---

## Database Schema

### Core Tables

#### `students`
**Purpose**: Master list of enrolled students

**Columns**:
- `id` (UUID): Primary key
- `student_id` (TEXT): Unique student ID (e.g., "21-12345")
- `full_name` (TEXT): Student's full name
- `email` (TEXT): Email address
- `program` (TEXT): Academic program (BSIT, BSCS, etc.)
- `year_level` (TEXT): Current year level
- `section` (TEXT): Section/class
- `status` (TEXT): active | inactive | graduated
- `auth_user_id` (UUID): Link to auth.users
- `created_at` (TIMESTAMPTZ): Record creation time

**Indexes**:
- `student_id` (unique)
- `status`
- `auth_user_id`

---

#### `profiles`
**Purpose**: User profile information

**Columns**:
- `id` (UUID): Primary key, references auth.users
- `display_name` (TEXT): User's display name
- `bio` (TEXT): User bio (max 120 chars)
- `avatar_seed` (TEXT): Avatar identifier
- `created_at` (TIMESTAMPTZ): Profile creation time
- `updated_at` (TIMESTAMPTZ): Last update time

---

#### `items`
**Purpose**: Registered items

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Owner's auth user ID
- `name` (TEXT): Item name
- `category` (TEXT): Item category
- `description` (TEXT): Detailed description
- `color` (TEXT): Primary color
- `brand` (TEXT): Brand/manufacturer
- `photo_urls` (TEXT[]): Array of photo URLs
- `qr_token` (TEXT): Unique QR code token
- `status` (TEXT): safe | lost | found
- `created_at` (TIMESTAMPTZ): Registration time
- `updated_at` (TIMESTAMPTZ): Last update time

**Indexes**:
- `user_id`
- `status`
- `qr_token` (unique)


---

#### `found_items`
**Purpose**: Reported found items

**Columns**:
- `id` (UUID): Primary key
- `reporter_id` (UUID): User who found the item
- `category` (TEXT): Item category
- `description` (TEXT): Description
- `location_found` (TEXT): Where it was found
- `date_found` (DATE): When it was found
- `photo_urls` (TEXT[]): Photos of found item
- `contact_info` (TEXT): Optional contact information
- `status` (TEXT): pending | matched | claimed
- `created_at` (TIMESTAMPTZ): Report time

**Indexes**:
- `reporter_id`
- `status`
- `date_found`

---

#### `ai_matches`
**Purpose**: AI-generated matches between lost and found items

**Columns**:
- `id` (UUID): Primary key
- `lost_item_id` (UUID): References items table
- `found_item_id` (UUID): References found_items table
- `confidence_score` (INTEGER): Match confidence (0-100)
- `reasoning` (TEXT): AI's reasoning for match
- `status` (TEXT): pending | confirmed | rejected
- `reviewed_at` (TIMESTAMPTZ): When owner reviewed
- `created_at` (TIMESTAMPTZ): Match creation time

**Indexes**:
- `lost_item_id`
- `found_item_id`
- `status`

---

#### `chat_threads`
**Purpose**: Chat conversations

**Columns**:
- `id` (UUID): Primary key
- `match_id` (UUID): Related match
- `participant_1` (UUID): First user
- `participant_2` (UUID): Second user
- `created_at` (TIMESTAMPTZ): Thread creation time
- `updated_at` (TIMESTAMPTZ): Last message time

---

#### `chat_messages`
**Purpose**: Individual chat messages

**Columns**:
- `id` (UUID): Primary key
- `thread_id` (UUID): References chat_threads
- `sender_id` (UUID): Message sender
- `message` (TEXT): Message content
- `read` (BOOLEAN): Read status
- `created_at` (TIMESTAMPTZ): Message time

**Indexes**:
- `thread_id`
- `sender_id`
- `created_at`


---

#### `notifications`
**Purpose**: User notifications

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Recipient
- `type` (TEXT): Notification type
- `title` (TEXT): Notification title
- `message` (TEXT): Notification body
- `data` (JSONB): Additional data
- `read` (BOOLEAN): Read status
- `created_at` (TIMESTAMPTZ): Notification time

**Indexes**:
- `user_id`
- `read`
- `created_at`

---

#### `admins`
**Purpose**: Admin users

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): References auth.users
- `full_name` (TEXT): Admin name
- `role` (TEXT): superadmin | admin | staff
- `created_at` (TIMESTAMPTZ): Admin creation time

**Indexes**:
- `user_id` (unique)

---

#### `custody_log`
**Purpose**: Physical item custody tracking

**Columns**:
- `id` (UUID): Primary key
- `item_id` (UUID): References items table
- `action` (TEXT): received | claimed | disposed | returned
- `handled_by` (UUID): Admin who handled it
- `shelf_tag` (TEXT): Storage location
- `notes` (TEXT): Additional notes
- `created_at` (TIMESTAMPTZ): Action time

**Indexes**:
- `item_id`
- `handled_by`
- `created_at`

---

#### `audit_log`
**Purpose**: System audit trail

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): User who performed action
- `action` (TEXT): Action type
- `table_name` (TEXT): Affected table
- `record_id` (UUID): Affected record
- `details` (JSONB): Action details
- `ip_address` (TEXT): User's IP
- `created_at` (TIMESTAMPTZ): Action time

**Indexes**:
- `user_id`
- `action`
- `table_name`
- `created_at`


---

## Deployment

### Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### Web Deployment (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Build for web: `expo export:web`
3. Deploy: `vercel --prod`

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "expo export:web",
  "outputDirectory": "dist",
  "framework": "expo"
}
```

### Mobile Deployment (EAS Build)

1. Install EAS CLI: `npm i -g eas-cli`
2. Configure: `eas build:configure`
3. Build Android: `eas build --platform android`
4. Build iOS: `eas build --platform ios`

**Configuration** (`eas.json`):
- Development build for testing
- Preview build for internal testing
- Production build for app stores

### Database Setup

1. Create Supabase project
2. Run `migration.sql` in SQL Editor
3. Run `admin-schema.sql` for admin tables
4. Configure Row Level Security (RLS) policies
5. Set up Storage buckets for photos

### Required Supabase Policies

**Items Table**:
- Users can read their own items
- Users can insert their own items
- Users can update their own items
- Admins can read/update all items

**Students Table**:
- Public read for student ID verification
- Only admins can insert/update

**Profiles Table**:
- Users can read/update their own profile
- Public read for display names


---

## Development Workflow

### Local Development

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env` file with credentials
4. Start development server: `npm start`
5. Press `w` for web, `a` for Android, `i` for iOS

### Testing

- **Web**: Open in browser at `http://localhost:8081`
- **Android**: Use Android Studio emulator or physical device
- **iOS**: Use Xcode simulator (Mac only) or physical device

### Code Organization Best Practices

1. **Component Structure**: Keep components small and focused
2. **State Management**: Use local state with useState, lift state when needed
3. **Data Fetching**: Use useEffect for initial load, real-time subscriptions for updates
4. **Error Handling**: Always wrap async operations in try-catch
5. **Loading States**: Show loading indicators during data fetching
6. **Validation**: Validate user input before submission
7. **Security**: Never expose service role key to client
8. **Audit Logging**: Log all admin actions

### Common Patterns

**Data Fetching Pattern**:
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    try {
      const { data, error } = await supabase
        .from('table')
        .select('*');
      if (error) throw error;
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

**Real-time Subscription Pattern**:
```javascript
useEffect(() => {
  const channel = supabase
    .channel('table_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name',
    }, (payload) => {
      // Handle change
      fetchData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Troubleshooting

### Common Issues

**Issue**: Name not showing in greeting
**Solution**: Check if profile has display_name, or if students table has full_name

**Issue**: QR code not scanning
**Solution**: Ensure camera permissions are granted, check QR code format

**Issue**: AI matching not working
**Solution**: Verify Gemini API key is set, check API quota

**Issue**: Photos not uploading
**Solution**: Check Supabase Storage bucket exists and has correct policies

**Issue**: Real-time updates not working
**Solution**: Verify Supabase real-time is enabled, check channel subscriptions

---

## Future Enhancements

- Push notifications for mobile
- Bulk QR code printing
- Analytics dashboard
- Item expiration/auto-archive
- Multi-language support
- Dark mode
- Offline support
- Image recognition for matching
- Integration with campus security cameras

---

## Credits

Developed for CTU Daanbantayan Campus Lost & Found System

**Version**: 1.0.0  
**Last Updated**: 2024

