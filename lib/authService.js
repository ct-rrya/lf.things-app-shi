import { supabase } from './supabase';

/**
 * Sign Up with Student Masterlist Validation
 * Validates student_id and email against the students table before creating account
 */
export async function signUpWithValidation({ studentId, email, password, phoneNumber }) {
  try {
    // Step 1: Validate student exists in masterlist
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: 'Student ID not found in masterlist. Please contact admin.',
      };
    }

    // Step 2: Validate email matches masterlist
    if (student.email.toLowerCase() !== email.toLowerCase()) {
      return {
        success: false,
        error: 'Email does not match the student record. Please use your registered email.',
      };
    }

    // Step 3: Check if student already has an account
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: 'This student ID already has an account. Please login instead.',
      };
    }

    // Step 4: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          student_id: studentId,
          phone_number: phoneNumber || null,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    // Step 5: Create user record linked to student
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        student_id: studentId,
        email: email.toLowerCase(),
        role: 'student',
        is_verified: false,
      });

    if (userError) {
      // Rollback: delete auth user if user record creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        error: 'Failed to create user profile. Please try again.',
      };
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      student,
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Login with Email or Student ID
 * Supports both email and student_id as login identifier
 */
export async function loginWithEmailOrStudentId({ identifier, password }) {
  try {
    let email = identifier;

    // Check if identifier is a student_id (not an email format)
    if (!identifier.includes('@')) {
      // Look up email from student_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('student_id', identifier)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Invalid student ID or password.',
        };
      }

      email = user.email;
    }

    // Attempt login with email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      return {
        success: false,
        error: 'Invalid email/student ID or password.',
      };
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);

    // Fetch user profile with student details
    const { data: profile } = await supabase.rpc('get_user_profile', {
      user_uuid: data.user.id,
    });

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile: profile?.[0] || null,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get Current User Profile with Student Details
 */
export async function getCurrentUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile, error } = await supabase.rpc('get_user_profile', {
      user_uuid: user.id,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      profile: profile?.[0] || null,
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: 'Failed to fetch profile',
    };
  }
}

/**
 * Logout
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Failed to logout' };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    return false;
  }
}
