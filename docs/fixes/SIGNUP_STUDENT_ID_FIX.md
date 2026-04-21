# Student ID Lookup Fix

## The Problem

Your signup form is not finding student IDs even though they exist in the database. The issues are:

1. **No numeric keyboard** - Student ID input doesn't have `keyboardType="numeric"`
2. **No format validation** - No check for 7-8 digit format
3. **No debugging** - Can't see what's being queried vs what's in database
4. **Potential whitespace** - `.trim()` is used but might not catch all cases

## The Solution

### 1. Add Debugging to See What's Happening

Add this right before the lookup query in `handleSignUp`:

```javascript
// Debug: Log what we're searching for
console.log('=== STUDENT ID LOOKUP DEBUG ===');
console.log('Input value:', studentId);
console.log('Trimmed value:', studentId.trim());
console.log('Length:', studentId.trim().length);
console.log('Type:', typeof studentId.trim());
console.log('================================');
```

### 2. Fix the Student ID Input Field

Change the Student ID input to use numeric keyboard:

```javascript
<TextInput
  style={styles.input}
  placeholder="e.g. 8230123"
  placeholderTextColor="rgba(69,53,75,0.35)"
  value={studentId}
  onChangeText={setStudentId}
  keyboardType="numeric"  // ADD THIS
  autoCapitalize="none"
  autoCorrect={false}
/>
```

### 3. Add Format Validation

Add this validation before the database lookup:

```javascript
// Validate student ID format (7-8 digits, numbers only)
const studentIdPattern = /^\d{7,8}$/;
if (!studentIdPattern.test(studentId.trim())) {
  showAlert('Invalid Student ID', 'Student ID must be 7-8 digits (numbers only). Example: 8230123');
  setLoading(false);
  return;
}
```

### 4. Enhanced Lookup Query with Better Error Handling

Replace the current lookup with this:

```javascript
// Verify student ID in master list
const cleanStudentId = studentId.trim();

console.log('=== STUDENT ID LOOKUP DEBUG ===');
console.log('Searching for:', cleanStudentId);
console.log('Length:', cleanStudentId.length);
console.log('Type:', typeof cleanStudentId);

const { data: student, error: lookupErr } = await supabase
  .from('students')
  .select('student_id, first_name, last_name, email, program, year_level, section, status, auth_user_id')
  .eq('student_id', cleanStudentId)
  .maybeSingle();

console.log('Query result:', { student, lookupErr });
console.log('================================');

if (lookupErr) {
  console.error('Lookup error:', lookupErr);
  showAlert('Database Error', `Failed to verify student ID: ${lookupErr.message}`);
  setLoading(false);
  return;
}

if (!student) {
  // Additional debug: Try to find similar IDs
  const { data: allStudents } = await supabase
    .from('students')
    .select('student_id')
    .limit(5);
  
  console.log('Sample student IDs in database:', allStudents?.map(s => s.student_id));
  
  showAlert('Not in the System',
    `Student ID "${cleanStudentId}" was not found. Please verify your ID and contact the Student Affairs Office if this is incorrect.`);
  setLoading(false);
  return;
}
```

### 5. Check Database for Type Mismatches

Run this SQL query in Supabase to verify your data:

```sql
-- Check student_id column type and sample data
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'student_id';

-- Check actual student IDs
SELECT 
  student_id,
  LENGTH(student_id) as id_length,
  first_name,
  last_name,
  email
FROM students
ORDER BY student_id
LIMIT 10;

-- Check for whitespace or special characters
SELECT 
  student_id,
  LENGTH(student_id) as stored_length,
  LENGTH(TRIM(student_id)) as trimmed_length,
  student_id = TRIM(student_id) as is_clean
FROM students
WHERE student_id IN ('8230123', '8230514', '8230521');
```

### 6. Create Index for Faster Lookups

```sql
-- Add index on student_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
```

## Complete Fixed handleSignUp Function

Here's the complete corrected function:

```javascript
async function handleSignUp() {
  // Validate terms
  if (!termsAccepted) {
    showAlert('Terms Required', 'Please accept the Terms & Conditions to continue');
    setShowTerms(true);
    return;
  }
  
  // Validate student ID
  if (!studentId.trim()) {
    showAlert('Student ID Required', 'Please enter your Student ID');
    return;
  }
  
  // Validate student ID format (7-8 digits, numbers only)
  const studentIdPattern = /^\d{7,8}$/;
  if (!studentIdPattern.test(studentId.trim())) {
    showAlert('Invalid Student ID Format', 'Student ID must be 7-8 digits (numbers only). Example: 8230123');
    return;
  }
  
  // Validate names
  if (!firstName.trim()) {
    showAlert('First Name Required', 'Please enter your first name');
    return;
  }
  
  if (!lastName.trim()) {
    showAlert('Last Name Required', 'Please enter your last name');
    return;
  }
  
  // Validate email
  if (!email.trim()) {
    showAlert('Email Required', 'Please enter your email address');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    showAlert('Invalid Email', 'Please enter a valid email address');
    return;
  }
  
  // Validate program and year level
  if (!program) {
    showAlert('Program Required', 'Please select your program');
    return;
  }
  
  if (!yearLevel) {
    showAlert('Year Level Required', 'Please select your year level');
    return;
  }
  
  // Validate password
  if (!password) {
    showAlert('Password Required', 'Please enter a password');
    return;
  }
  
  if (password.length < 6) {
    showAlert('Password Too Short', 'Password must be at least 6 characters');
    return;
  }
  
  setLoading(true);
  try {
    // Clean and prepare student ID
    const cleanStudentId = studentId.trim();
    
    // Debug logging
    console.log('=== STUDENT ID LOOKUP DEBUG ===');
    console.log('Searching for:', cleanStudentId);
    console.log('Length:', cleanStudentId.length);
    console.log('Type:', typeof cleanStudentId);
    
    // Verify student ID in master list
    const { data: student, error: lookupErr } = await supabase
      .from('students')
      .select('student_id, first_name, last_name, email, program, year_level, section, status, auth_user_id')
      .eq('student_id', cleanStudentId)
      .maybeSingle();

    console.log('Query result:', { 
      found: !!student, 
      studentId: student?.student_id,
      error: lookupErr?.message 
    });
    console.log('================================');

    if (lookupErr) {
      console.error('Lookup error:', lookupErr);
      showAlert('Database Error', `Failed to verify student ID: ${lookupErr.message}`);
      setLoading(false);
      return;
    }
    
    if (!student) {
      // Debug: Try to find similar IDs
      const { data: sampleStudents } = await supabase
        .from('students')
        .select('student_id')
        .limit(5);
      
      console.log('Sample student IDs in database:', sampleStudents?.map(s => s.student_id));
      
      showAlert('Not in the System',
        `Student ID "${cleanStudentId}" was not found in our records.\n\nPlease verify your Student ID and contact the Student Affairs Office if this is incorrect.`);
      setLoading(false);
      return;
    }
    
    if (student.status !== 'active') {
      showAlert('Inactive Account', 'Your student record is inactive. Contact the Student Affairs Office.');
      setLoading(false);
      return;
    }
    
    if (student.auth_user_id) {
      showAlert('Already Registered', 'This Student ID already has an account. Please sign in.');
      setMode('login');
      setLoading(false);
      return;
    }

    // Verify email matches the student record (if email exists in masterlist)
    if (student.email && student.email.toLowerCase() !== email.trim().toLowerCase()) {
      showAlert('Email Mismatch', 
        `The email you entered doesn't match our records.\n\nPlease use: ${student.email}`);
      setLoading(false);
      return;
    }

    // Create auth account
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          student_id: cleanStudentId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          program: program,
          year_level: yearLevel,
          section: section.trim() || null,
        },
      },
    });
    
    if (error) throw error;

    console.log('Auth signup successful:', data.user?.id);

    // Update students table with auth_user_id
    if (data.user) {
      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          auth_user_id: data.user.id,
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq('student_id', cleanStudentId);

      if (updateError) {
        console.error('Failed to link student account:', updateError);
        showAlert('Linking Error', 
          `Account created but failed to link: ${updateError.message}\n\nPlease contact support.`);
        setLoading(false);
        return;
      }

      // Create/Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: email.trim().toLowerCase(),
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          student_id: cleanStudentId,
          program: program,
          year_level: yearLevel,
          section: section.trim() || null,
          avatar_seed: cleanStudentId,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the whole process for profile error
      }
    }

    showAlert('Account Created!', 'You can now sign in with your email and password.', [
      { text: 'Sign In', onPress: () => {
        setMode('login');
        setStudentId('');
        setFirstName('');
        setLastName('');
        setMiddleName('');
        setEmail('');
        setPassword('');
        setProgram('');
        setYearLevel('');
        setSection('');
        setPhoneNumber('');
      }}
    ]);
    
  } catch (err) {
    console.error('Signup error:', err);
    showAlert('Sign Up Failed', err.message);
  } finally {
    setLoading(false);
  }
}
```

## Testing Steps

1. **Add the debugging** - Add console.log statements
2. **Update the input** - Add `keyboardType="numeric"`
3. **Test with existing ID** - Try signing up with `8230521`
4. **Check console** - Look at the debug output
5. **Verify database** - Run the SQL queries to check data

## Common Issues and Solutions

### Issue: "Student ID was not found" but it exists

**Possible causes:**
1. Whitespace in database: `"8230521 "` vs `"8230521"`
2. Type mismatch: Number vs String
3. Case sensitivity (unlikely with numbers)
4. RLS policy blocking the query

**Solution:**
```sql
-- Clean up whitespace in database
UPDATE students 
SET student_id = TRIM(student_id)
WHERE student_id != TRIM(student_id);

-- Verify the data
SELECT student_id, LENGTH(student_id), first_name 
FROM students 
WHERE student_id = '8230521';
```

### Issue: RLS policy blocking lookup

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'students';

-- If RLS is enabled, add policy for signup
CREATE POLICY "Allow signup lookup" ON students
  FOR SELECT
  USING (true);  -- Allow anyone to lookup for signup verification
```

### Issue: Still not working after all fixes

**Debug checklist:**
1. Check Supabase logs in Dashboard → Logs
2. Verify anon key has access to students table
3. Test the query directly in SQL Editor
4. Check for any database triggers that might interfere
5. Verify the student_id column type is TEXT not INTEGER

## SQL to Add Missing Students

If you need to add test students:

```sql
INSERT INTO students (student_id, first_name, last_name, email, program, year_level, section, status)
VALUES 
  ('8230123', 'Pedro', 'Santos', 'pedro.santos@gmail.com', 'BSIT', '3rd Year', 'A', 'active'),
  ('8230514', 'Lord Jason', 'Riveral', 'jason@gmail.com', 'BSCS', '2nd Year', 'B', 'active'),
  ('8230521', 'Merry Apple', 'Edano', 'apple@gmail.com', 'BSIT', '1st Year', 'A', 'active')
ON CONFLICT (student_id) DO NOTHING;
```

## Expected Console Output (When Working)

```
=== STUDENT ID LOOKUP DEBUG ===
Searching for: 8230521
Length: 7
Type: string
Query result: { found: true, studentId: '8230521', error: undefined }
================================
Auth signup successful: uuid-here
```

## Expected Console Output (When Not Found)

```
=== STUDENT ID LOOKUP DEBUG ===
Searching for: 8230521
Length: 7
Type: string
Query result: { found: false, studentId: undefined, error: undefined }
Sample student IDs in database: ['8230123', '8230514', '8230999']
================================
```

This will help you identify exactly where the mismatch is happening!
