# LF.things - Code Documentation Part 2

## Lib Folder - Core Business Logic

### lib/supabase.js - Supabase Client

**Purpose**: Initialize and export Supabase client

**Code**:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Configuration**:
- Uses environment variables for URL and key
- AsyncStorage for auth persistence
- Auto-refresh tokens enabled
- Session persistence enabled

**Usage Throughout App**:
```javascript
import { supabase } from '../lib/supabase';

// Auth operations
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password });
await supabase.auth.signOut();

// Database operations
await supabase.from('items').select('*');
await supabase.from('items').insert([data]);
await supabase.from('items').update(data).eq('id', id);

// Storage operations
await supabase.storage.from('item-photos').upload(path, file);
const { data } = supabase.storage.from('item-photos').getPublicUrl(path);

// Real-time subscriptions
supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, callback)
  .subscribe();
```

---

### lib/supabaseAdmin.js - Admin Client

**Purpose**: Supabase client with service role key (bypasses RLS)

**Code**:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

**Security Warning**:
- Service role key bypasses Row Level Security
- Should NEVER be exposed to client-side code
- Only use in server-side functions or admin screens with proper auth checks

**Usage**:
```javascript
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Admin operations that bypass RLS
await supabaseAdmin.from('students').select('*'); // All students
await supabaseAdmin.from('items').update(data).eq('id', id); // Any item
```

---

### lib/aiMatching.js - AI Matching Algorithm

**Purpose**: Match found items with lost items using Google Gemini AI

**Key Function**:

#### `findMatches(foundItem, lostItems)`
```javascript
export async function findMatches(foundItem, lostItems)
```

**Parameters**:
- `foundItem`: Object - The found item to match
- `lostItems`: Array - All lost items to compare against

**Returns**:
- Array of match objects: `[{ lostItem, score, reasoning, breakdown }]`

**Implementation**:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

export async function findMatches(foundItem, lostItems) {
  if (!lostItems || lostItems.length === 0) return [];
  
  const matches = [];
  
  for (const lostItem of lostItems) {
    try {
      // 1. Build comparison prompt
      const prompt = buildComparisonPrompt(foundItem, lostItem);
      
      // 2. Call Gemini AI
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // 3. Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      
      const matchData = JSON.parse(jsonMatch[0]);
      
      // 4. Check threshold (70+)
      if (matchData.score >= 70) {
        matches.push({
          lostItem,
          score: matchData.score,
          reasoning: matchData.reasoning,
          breakdown: matchData.breakdown,
        });
      }
    } catch (error) {
      console.error('AI matching error for item:', lostItem.id, error);
      continue;
    }
  }
  
  // 5. Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
```

**Prompt Structure**:
```javascript
function buildComparisonPrompt(foundItem, lostItem) {
  return `
You are an AI assistant helping match found items with lost items.

FOUND ITEM:
- Category: ${foundItem.category}
- Color: ${foundItem.color || 'Not specified'}
- Brand: ${foundItem.brand || 'Not specified'}
- Description: ${foundItem.description || 'None'}

LOST ITEM:
- Category: ${lostItem.category}
- Color: ${lostItem.color || 'Not specified'}
- Brand: ${lostItem.brand || 'Not specified'}
- Description: ${lostItem.description || 'None'}

Analyze if these items could be the same. Return JSON:
{
  "score": 0-100,
  "reasoning": "Brief explanation",
  "breakdown": {
    "category_match": 0-100,
    "color_match": 0-100,
    "brand_match": 0-100,
    "description_match": 0-100
  }
}

Scoring guidelines:
- 90-100: Almost certainly the same item
- 70-89: Likely match, worth notifying owner
- 50-69: Possible match, but uncertain
- Below 50: Unlikely match
`;
}
```

**Matching Criteria**:
1. **Category Match** (30% weight)
   - Exact match: 100
   - Similar category: 50-80
   - Different: 0-30

2. **Color Match** (25% weight)
   - Exact match: 100
   - Similar shade: 70-90
   - Different: 0-50

3. **Brand Match** (25% weight)
   - Exact match: 100
   - Same manufacturer: 80
   - Different: 0

4. **Description Match** (20% weight)
   - Semantic similarity analysis
   - Keyword matching
   - Feature comparison

**Usage in App**:
```javascript
import { findMatches } from '../lib/aiMatching';

// After found item is reported
const { data: lostItems } = await supabase
  .from('items')
  .select('*')
  .eq('status', 'lost');

const matches = await findMatches(foundItem, lostItems);

// Insert matches into database
if (matches.length > 0) {
  await supabase.from('ai_matches').insert(
    matches.map(match => ({
      lost_item_id: match.lostItem.id,
      found_item_id: foundItem.id,
      match_score: match.score,
      match_details: {
        reasoning: match.reasoning,
        breakdown: match.breakdown,
      },
    }))
  );
  
  // Create notifications for owners
  for (const match of matches) {
    await supabase.from('notifications').insert({
      user_id: match.lostItem.user_id,
      type: 'match_found',
      title: 'Possible Match Found!',
      message: `Your ${match.lostItem.name} may have been found`,
      data: { match_id: match.id },
    });
  }
}
```

**Error Handling**:
- Continues on individual item errors
- Logs errors for debugging
- Returns partial results if some matches fail
- Gracefully handles API rate limits



---

### lib/auditLog.js - Audit Logging System

**Purpose**: Track all admin and user actions for accountability

**Key Function**:

#### `logAuditEvent(action, details, userId)`
```javascript
export async function logAuditEvent(action, details, userId = null)
```

**Parameters**:
- `action`: string - Action type (e.g., 'user.created', 'item.deleted')
- `details`: object - Additional context
- `userId`: string - User who performed action (optional, auto-detected)

**Implementation**:
```javascript
import { supabase } from './supabase';

export async function logAuditEvent(action, details = {}, userId = null) {
  try {
    // 1. Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    
    // 2. Get IP address and user agent (if available)
    const ipAddress = await getClientIP();
    const userAgent = navigator?.userAgent || 'Unknown';
    
    // 3. Insert audit log
    const { error } = await supabase
      .from('audit_log')
      .insert([{
        user_id: userId,
        action,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      }]);
    
    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (error) {
    // Don't throw - audit logging should never break app flow
    console.error('Audit logging failed:', error);
  }
}
```

**Action Types**:

**User Actions**:
- `user.login` - User signed in
- `user.logout` - User signed out
- `user.register` - New account created
- `user.profile_update` - Profile information changed

**Item Actions**:
- `item.created` - New item registered
- `item.updated` - Item details changed
- `item.deleted` - Item removed
- `item.status_changed` - Status updated (safe → lost, etc.)

**Match Actions**:
- `match.created` - AI match generated
- `match.confirmed` - Owner confirmed match
- `match.rejected` - Owner rejected match

**Admin Actions**:
- `admin.student_added` - Student added to master list
- `admin.student_updated` - Student information changed
- `admin.student_deleted` - Student removed
- `admin.user_viewed` - Admin viewed user details
- `admin.item_viewed` - Admin viewed item details
- `admin.custody_logged` - Item custody event recorded

**Usage Examples**:

```javascript
import { logAuditEvent } from '../lib/auditLog';

// Log user registration
await logAuditEvent('user.register', {
  student_id: studentId,
  email: email,
});

// Log item creation
await logAuditEvent('item.created', {
  item_id: newItem.id,
  category: newItem.category,
  name: newItem.name,
});

// Log admin action
await logAuditEvent('admin.student_added', {
  student_id: student.student_id,
  full_name: student.full_name,
  program: student.program,
}, adminUserId);

// Log status change
await logAuditEvent('item.status_changed', {
  item_id: item.id,
  old_status: 'safe',
  new_status: 'lost',
});
```

**Querying Audit Logs**:
```javascript
// Get all logs for a user
const { data: logs } = await supabase
  .from('audit_log')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Get logs by action type
const { data: adminLogs } = await supabase
  .from('audit_log')
  .select('*')
  .like('action', 'admin.%')
  .order('created_at', { ascending: false });

// Get logs in date range
const { data: recentLogs } = await supabase
  .from('audit_log')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

---

### lib/categoryForms.js - Dynamic Form Fields

**Purpose**: Define category-specific form fields for items

**Categories Array**:
```javascript
export const CATEGORIES = [
  { id: 'id', label: 'ID / Card' },
  { id: 'keys', label: 'Keys' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'phone', label: 'Phone' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'bag', label: 'Bag' },
  { id: 'watch', label: 'Watch' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'other', label: 'Other' },
];
```

**Key Function**:

#### `getCategoryFields(categoryId)`
```javascript
export function getCategoryFields(categoryId)
```

**Returns**: Array of field objects
```javascript
[
  {
    name: 'color',
    label: 'Color',
    placeholder: 'e.g., Blue, Red, Black',
    required: true,
  },
  {
    name: 'brand',
    label: 'Brand',
    placeholder: 'e.g., Apple, Samsung',
    required: false,
  },
  // ... more fields
]
```

**Field Definitions by Category**:

**ID / Card**:
```javascript
case 'id':
  return [
    { name: 'color', label: 'Color', placeholder: 'Card color', required: true },
    { name: 'id_type', label: 'ID Type', placeholder: 'Student ID, Driver\'s License, etc.', required: true },
    { name: 'id_number', label: 'ID Number', placeholder: 'Last 4 digits only', required: false },
  ];
```

**Keys**:
```javascript
case 'keys':
  return [
    { name: 'color', label: 'Color', placeholder: 'Keychain color', required: true },
    { name: 'key_type', label: 'Type', placeholder: 'House key, Car key, etc.', required: true },
    { name: 'keychain', label: 'Keychain', placeholder: 'Describe keychain', required: false },
  ];
```

**Laptop**:
```javascript
case 'laptop':
  return [
    { name: 'color', label: 'Color', placeholder: 'e.g., Silver, Black', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Apple, Dell, HP', required: true },
    { name: 'model', label: 'Model', placeholder: 'e.g., MacBook Pro, XPS 13', required: false },
    { name: 'serial', label: 'Serial Number', placeholder: 'Last 4 digits', required: false },
  ];
```

**Phone**:
```javascript
case 'phone':
  return [
    { name: 'color', label: 'Color', placeholder: 'Phone color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Apple, Samsung', required: true },
    { name: 'model', label: 'Model', placeholder: 'e.g., iPhone 13, Galaxy S21', required: false },
  ];
```

**Bottle**:
```javascript
case 'bottle':
  return [
    { name: 'color', label: 'Color', placeholder: 'Bottle color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Hydro Flask, Nalgene', required: false },
    { name: 'size', label: 'Size', placeholder: 'e.g., 500ml, 1L', required: false },
  ];
```

**Wallet**:
```javascript
case 'wallet':
  return [
    { name: 'color', label: 'Color', placeholder: 'Wallet color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Leather, Fabric', required: false },
    { name: 'material', label: 'Material', placeholder: 'Leather, Fabric, etc.', required: false },
  ];
```

**Bag**:
```javascript
case 'bag':
  return [
    { name: 'color', label: 'Color', placeholder: 'Bag color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., JanSport, Nike', required: false },
    { name: 'type', label: 'Type', placeholder: 'Backpack, Tote, etc.', required: true },
  ];
```

**Watch**:
```javascript
case 'watch':
  return [
    { name: 'color', label: 'Color', placeholder: 'Watch color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Casio, Apple', required: false },
    { name: 'type', label: 'Type', placeholder: 'Digital, Analog, Smart', required: false },
  ];
```

**Headphones**:
```javascript
case 'headphones':
  return [
    { name: 'color', label: 'Color', placeholder: 'Headphone color', required: true },
    { name: 'brand', label: 'Brand', placeholder: 'e.g., Sony, Beats', required: false },
    { name: 'type', label: 'Type', placeholder: 'Wired, Wireless, Earbuds', required: false },
  ];
```

**Other**:
```javascript
case 'other':
  return [
    { name: 'color', label: 'Color', placeholder: 'Item color', required: true },
    { name: 'item_type', label: 'Item Type', placeholder: 'What is it?', required: true },
  ];
```

**Usage in Forms**:
```javascript
import { getCategoryFields } from '../lib/categoryForms';

const fields = getCategoryFields(category.id);

// Render dynamic fields
{fields.map((field) => (
  <View key={field.name}>
    <Text>
      {field.label.toUpperCase()}
      {field.required ? ' *' : ' (optional)'}
    </Text>
    <TextInput
      placeholder={field.placeholder}
      value={formData[field.name] || ''}
      onChangeText={(text) => setFormData({ ...formData, [field.name]: text })}
    />
  </View>
))}
```



---

### lib/ctuConstants.js - CTU-Specific Constants

**Purpose**: Define CTU Daanbantayan-specific data

**Exports**:

#### `CTU_PROGRAMS`
```javascript
export const CTU_PROGRAMS = [
  'BSIT', // Bachelor of Science in Information Technology
  'BSCS', // Bachelor of Science in Computer Science
  'BSA',  // Bachelor of Science in Agriculture
  'BSED', // Bachelor of Secondary Education
  'BEED', // Bachelor of Elementary Education
  'BSBA', // Bachelor of Science in Business Administration
];
```

#### `CTU_YEAR_LEVELS`
```javascript
export const CTU_YEAR_LEVELS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];
```

#### `CTU_LOCATIONS`
```javascript
export const CTU_LOCATIONS = [
  'Main Building',
  'Library',
  'Gymnasium',
  'Canteen',
  'Computer Lab',
  'Science Lab',
  'Auditorium',
  'Parking Lot',
  'Playground',
  'Other',
];
```

#### `CTU_INFO`
```javascript
export const CTU_INFO = {
  name: 'Cebu Technological University',
  campus: 'Daanbantayan Campus',
  tagline: 'Excellence in Education',
  address: 'Daanbantayan, Cebu, Philippines',
};
```

#### `validateStudentId(id)`
```javascript
export function validateStudentId(id)
```

**Purpose**: Validate student ID format

**Format**: `YY-NNNNN`
- YY: 2-digit year (e.g., 21, 22, 23)
- NNNNN: 5-digit student number

**Implementation**:
```javascript
export function validateStudentId(id) {
  // Pattern: YY-NNNNN
  const pattern = /^\d{2}-\d{5}$/;
  
  if (!pattern.test(id)) {
    return {
      valid: false,
      error: 'Invalid format. Use YY-NNNNN (e.g., 21-12345)',
    };
  }
  
  const [year, number] = id.split('-');
  const yearNum = parseInt(year);
  const currentYear = new Date().getFullYear() % 100;
  
  // Check if year is reasonable (not in future, not too old)
  if (yearNum > currentYear) {
    return {
      valid: false,
      error: 'Year cannot be in the future',
    };
  }
  
  if (yearNum < currentYear - 10) {
    return {
      valid: false,
      error: 'Student ID is too old',
    };
  }
  
  return { valid: true };
}
```

**Usage**:
```javascript
import { validateStudentId, CTU_PROGRAMS, CTU_LOCATIONS } from '../lib/ctuConstants';

// Validate student ID
const validation = validateStudentId('21-12345');
if (!validation.valid) {
  Alert.alert('Invalid Student ID', validation.error);
}

// Use in dropdowns
<Picker>
  {CTU_PROGRAMS.map(program => (
    <Picker.Item key={program} label={program} value={program} />
  ))}
</Picker>

<Picker>
  {CTU_LOCATIONS.map(location => (
    <Picker.Item key={location} label={location} value={location} />
  ))}
</Picker>
```

---

## Styles Folder - Design System

### styles/colors.js - Color Palette

**Purpose**: Define app-wide color constants

**Color Definitions**:
```javascript
export const colors = {
  // Primary colors
  gold: '#F5C842',      // Primary accent (buttons, highlights)
  ember: '#E53935',     // Danger/alerts (red)
  success: '#10b981',   // Success states (green)
  
  // Neutrals
  grape: '#45354B',     // Dark purple (headers, text)
  custard: '#DECF9D',   // Light cream (accents)
  background: '#F5F0E8', // Main background (cream)
  surface: '#FFFFFF',   // Cards, modals
  
  // Text colors
  dark: '#1A1611',      // Primary text (almost black)
  muted: '#8A8070',     // Secondary text (gray)
  
  // UI elements
  border: '#E8E0D0',    // Borders, dividers
  accent: '#F5C842',    // Same as gold
  danger: '#E53935',    // Same as ember
};
```

**Usage**:
```javascript
import { colors } from '../styles/colors';

<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.dark }}>Hello</Text>
  <TouchableOpacity style={{ backgroundColor: colors.gold }}>
    <Text style={{ color: '#FFFFFF' }}>Button</Text>
  </TouchableOpacity>
</View>
```

---

### styles/theme.js - Design System

**Purpose**: Comprehensive design system with typography, spacing, and component styles

**Typography**:
```javascript
export const typography = {
  // Font sizes
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  
  // Font weights
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
  
  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};
```

**Spacing Scale**:
```javascript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};
```

**Component Styles**:
```javascript
export const components = {
  // Button styles
  button: {
    primary: {
      backgroundColor: colors.gold,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
    },
  },
  
  // Card styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  
  // Input styles
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.base,
    color: colors.dark,
  },
};
```

**Usage**:
```javascript
import { colors, typography, spacing, components } from '../styles/theme';

<View style={components.card}>
  <Text style={{
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.dark,
    marginBottom: spacing.sm,
  }}>
    Card Title
  </Text>
  
  <TouchableOpacity style={components.button.primary}>
    <Text style={{ color: '#FFFFFF', fontWeight: typography.bold }}>
      Primary Button
    </Text>
  </TouchableOpacity>
</View>
```

---

## Components Folder

### components/SplashScreen.js - Loading Screen

**Purpose**: Display app logo during initial load

**Implementation**:
```javascript
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../styles/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>
          LF<Text style={styles.logoEmber}>.</Text>things
        </Text>
        <Text style={styles.tagline}>CTU Daanbantayan</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grape,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.custard,
    letterSpacing: 0.5,
  },
  logoEmber: {
    color: colors.ember,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(222,207,157,0.5)',
    marginTop: 8,
  },
});
```

**Usage**:
```javascript
import SplashScreen from '../components/SplashScreen';

export default function AuthScreen() {
  const [showSplash, setShowSplash] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  if (showSplash) return <SplashScreen />;
  
  return <View>...</View>;
}
```

