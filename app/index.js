import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../styles/colors';
import SplashScreen from '../components/SplashScreen';
import { CTU_PROGRAMS, CTU_YEAR_LEVELS } from '../lib/ctuConstants';
import { showAlert, setWebAlertHandler } from '../lib/alert';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [section, setSection] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // Register web alert handler
  useEffect(() => {
    if (Platform.OS === 'web') {
      setWebAlertHandler((config) => setAlertConfig(config));
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 2200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    const t = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashScreen />;

  async function handleSignIn() {
    if (!email.trim()) {
      showAlert('Email Required', 'Please enter your email address to sign in');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    if (!password) {
      showAlert('Password Required', 'Please enter your password');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.replace('/(tabs)/home');
    } catch (err) {
      showAlert('Sign In Failed',
        err.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

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

  const isLogin = mode === 'login';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {Platform.OS === 'web' && <View style={styles.webBg} />}
      <KeyboardAvoidingView
        style={[styles.keyboardView, Platform.OS === 'web' && styles.webFrame]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View style={styles.brandSection}>
            <View style={styles.brandPill}>
              <View style={styles.brandPillDot} />
              <Text style={styles.brandPillText}>CAMPUS LOST & FOUND</Text>
            </View>
            <Text style={styles.logoText}>
              LF<Text style={styles.logoEmber}>.</Text>things
            </Text>
            <Text style={styles.logoSub}>CTU Daanbantayan</Text>
            <View style={styles.featureRow}>
              <View style={styles.featurePill}>
                <Ionicons name="qr-code-outline" size={11} color={colors.gold} />
                <Text style={styles.featurePillText}>QR Tags</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="flash-outline" size={11} color={colors.gold} />
                <Text style={styles.featurePillText}>AI Matching</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.gold} />
                <Text style={styles.featurePillText}>CTU Verified</Text>
              </View>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, isLogin && styles.modeTabActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, !isLogin && styles.modeTabActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formDivider} />

            <Text style={styles.formSub}>
              {isLogin ? 'Sign in with your email and password' : 'Create your account using your Student ID'}
            </Text>

            <View style={styles.formBody}>
              {/* Student ID — sign up only */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>STUDENT ID *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="card-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 8230123"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={studentId}
                      onChangeText={setStudentId}
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* First Name — sign up only */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>FIRST NAME *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Juan"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Last Name — sign up only */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>LAST NAME *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Dela Cruz"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Middle Name — sign up only (optional) */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>MIDDLE NAME (OPTIONAL)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Optional"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={middleName}
                      onChangeText={setMiddleName}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Email — both modes */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>EMAIL *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@ctu.edu.ph"
                    placeholderTextColor="rgba(69,53,75,0.35)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Phone Number — sign up only (optional) */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="09123456789"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Program — sign up only */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>PROGRAM *</Text>
                  <View style={styles.pickerContainer}>
                    {CTU_PROGRAMS.map((prog) => (
                      <TouchableOpacity
                        key={prog}
                        style={[
                          styles.pickerOption,
                          program === prog && styles.pickerOptionSelected,
                        ]}
                        onPress={() => setProgram(prog)}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            program === prog && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {prog}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Year Level — sign up only */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>YEAR LEVEL *</Text>
                  <View style={styles.pickerContainer}>
                    {CTU_YEAR_LEVELS.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.pickerOption,
                          yearLevel === year && styles.pickerOptionSelected,
                        ]}
                        onPress={() => setYearLevel(year)}
                        disabled={loading}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            yearLevel === year && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Section — sign up only (optional) */}
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>SECTION (OPTIONAL)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="people-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 3A"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={section}
                      onChangeText={setSection}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Password — both modes */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>PASSWORD *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                    placeholderTextColor="rgba(69,53,75,0.35)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={15}
                      color="rgba(69,53,75,0.35)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={isLogin ? handleSignIn : handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {!loading && (
                  <Ionicons
                    name={isLogin ? 'log-in-outline' : 'person-add-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.buttonText}>
                  {loading ? 'LOADING…' : isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </Text>
              </TouchableOpacity>

              {/* Terms checkbox for signup */}
              {!isLogin && (
                <TouchableOpacity
                  style={styles.termsCheckRow}
                  onPress={() => setShowTerms(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.termsCheckLabel}>
                    I agree to the Terms & Conditions
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.footer}>LF but for things · v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

        {/* ── TERMS & CONDITIONS MODAL ── */}
      <Modal visible={showTerms} transparent animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.termsOverlay}>
          <View style={styles.termsModal}>
            <View style={styles.termsHeader}>
              <View style={styles.termsIconWrap}>
                <Ionicons name="document-text" size={24} color="#F5C842" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.termsTitle}>Terms & Conditions</Text>
                <Text style={styles.termsSub}>LF.things — CTU Daanbantayan Lost & Found</Text>
              </View>
            </View>

            <ScrollView style={styles.termsBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsSection}>What is LF.things?</Text>
              <Text style={styles.termsText}>
                LF.things is the official Lost & Found system of CTU Daanbantayan. It helps students register their belongings with a unique QR code, report found items, and get notified when a match is detected.
              </Text>

              <Text style={styles.termsSection}>What the app does</Text>
              <Text style={styles.termsText}>
                • Register your personal items and generate a QR code sticker{'\n'}
                • Mark items as lost and receive AI-powered match suggestions{'\n'}
                • Report found items anonymously or with contact details{'\n'}
                • Communicate with finders or owners through in-app chat{'\n'}
                • Notify the SSG Office when an item is turned in
              </Text>

              <Text style={styles.termsSection}>Important disclaimer</Text>
              <View style={styles.disclaimerBox}>
                <View style={styles.disclaimerIcon}>
                  <Ionicons name="alert-circle" size={20} color="#E53935" />
                </View>
                <Text style={styles.disclaimerText}>
                  LF.things is a tool to assist in recovering lost items, but it does NOT guarantee that your lost item will be found or returned. The app relies on the community reporting found items. The administrators, SSG Office, and CTU Daanbantayan staff are NOT responsible for physically searching for, locating, or recovering your lost belongings. This system simply increases the chances of reuniting lost items with their owners through technology and community cooperation.
                </Text>
              </View>

              <Text style={styles.termsSection}>Data we collect</Text>
              <Text style={styles.termsText}>
                We collect your student ID, name, program, year level, email address, and photos of registered items. This information is used solely to operate the lost and found system and is accessible only to you and authorized CTU Daanbantayan staff.
              </Text>

              <Text style={styles.termsSection}>What we do NOT do</Text>
              <Text style={styles.termsText}>
                • We do not sell or share your data with third parties{'\n'}
                • We do not use your information for marketing{'\n'}
                • We do not store payment information of any kind{'\n'}
                • We do not track your location
              </Text>

              <Text style={styles.termsSection}>Your responsibilities</Text>
              <Text style={styles.termsText}>
                By creating an account, you agree to provide accurate information, use the app only for its intended purpose, and not misuse the system to make false reports or claims.
              </Text>

              <Text style={styles.termsSection}>Account eligibility</Text>
              <Text style={styles.termsText}>
                Only currently enrolled students of CTU Daanbantayan with an active student record may register. Your Student ID must be pre-registered in the system by the Student Affairs Office.
              </Text>

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={styles.termsFooter}>
              <TouchableOpacity
                style={styles.termsCheckRowModal}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.termsCheckLabelModal}>
                  I have read and agree to the Terms & Conditions
                </Text>
              </TouchableOpacity>

              <View style={styles.termsActions}>
                <TouchableOpacity style={styles.termsBtnCancel} onPress={() => setShowTerms(false)} activeOpacity={0.8}>
                  <Text style={styles.termsBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.termsBtnAccept, !termsAccepted && { opacity: 0.4 }]}
                  disabled={!termsAccepted}
                  onPress={() => setShowTerms(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.termsBtnAcceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CUSTOM ALERT MODAL (for web compatibility) ── */}
      {alertConfig && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setAlertConfig(null)}>
          <View style={styles.alertOverlay}>
            <View style={styles.alertModal}>
              <View style={styles.alertHeader}>
                <Ionicons 
                  name={alertConfig.title.toLowerCase().includes('error') || alertConfig.title.toLowerCase().includes('failed') ? 'alert-circle' : 'information-circle'} 
                  size={24} 
                  color={alertConfig.title.toLowerCase().includes('error') || alertConfig.title.toLowerCase().includes('failed') ? '#E53935' : '#1A1611'} 
                />
                <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              </View>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <View style={styles.alertActions}>
                {(alertConfig.buttons || [{ text: 'OK' }]).map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      button.style === 'cancel' && styles.alertButtonCancel,
                      (alertConfig.buttons || []).length === 1 && styles.alertButtonSingle,
                    ]}
                    onPress={() => {
                      setAlertConfig(null);
                      if (button.onPress) button.onPress();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      button.style === 'cancel' && styles.alertButtonTextCancel,
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grape },
  webBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.grape },
  keyboardView: { flex: 1 },
  webFrame: { maxWidth: 480, width: '100%', alignSelf: 'center', flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 60 },

  brandSection: { alignItems: 'center', marginBottom: 32 },
  brandPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(219,179,84,0.12)', borderWidth: 1,
    borderColor: 'rgba(219,179,84,0.25)', paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 20, marginBottom: 20,
  },
  brandPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  brandPillText: { fontSize: 9, fontWeight: '700', color: colors.gold, letterSpacing: 2 },
  logoText: { fontSize: 52, fontWeight: '900', color: colors.custard, letterSpacing: 0.5, marginBottom: 4 },
  logoEmber: { color: colors.ember },
  logoSub: { fontSize: 13, color: 'rgba(222,207,157,0.5)', marginBottom: 16 },
  featureRow: { flexDirection: 'row', gap: 8 },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(222,207,157,0.07)', borderWidth: 1,
    borderColor: 'rgba(222,207,157,0.12)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  featurePillText: { fontSize: 10, color: 'rgba(222,207,157,0.55)', fontWeight: '500' },

  formCard: {
    backgroundColor: '#F2EAD0', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modeTabs: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(69,53,75,0.08)', borderRadius: 12, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#FFFFFF' },
  modeTabText: { fontSize: 13, fontWeight: '600', color: 'rgba(69,53,75,0.4)' },
  modeTabTextActive: { color: colors.grape, fontWeight: '700' },
  formDivider: { height: 1, backgroundColor: 'rgba(69,53,75,0.08)', marginVertical: 14 },
  formSub: { fontSize: 12, color: 'rgba(69,53,75,0.45)', marginBottom: 14 },
  formBody: { gap: 12 },
  formGroup: { gap: 5 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: colors.grape, letterSpacing: 1 },
  inputWrap: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(69,53,75,0.12)',
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8, flexShrink: 0 },
  input: {
    flex: 1, fontSize: 13, color: colors.grape, paddingVertical: 12,
    ...(Platform.OS === 'web' && { outlineWidth: 0 }),
  },
  eyeBtn: { padding: 4, marginLeft: 4 },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(69,53,75,0.12)',
    backgroundColor: '#FFFFFF',
  },
  pickerOptionSelected: {
    borderColor: colors.grape,
    backgroundColor: 'rgba(69,53,75,0.08)',
  },
  pickerOptionText: {
    fontSize: 12,
    color: 'rgba(69,53,75,0.6)',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    fontWeight: '700',
    color: colors.grape,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.ember, padding: 15, borderRadius: 12, marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: 'rgba(222,207,157,0.25)', fontSize: 11, marginTop: 28 },

  // ── Terms & Conditions ──
  termsCheckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 2,
    borderColor: 'rgba(69,53,75,0.2)', justifyContent: 'center',
    alignItems: 'center', flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.grape, borderColor: colors.grape,
  },
  termsCheckLabel: {
    flex: 1, fontSize: 11, color: 'rgba(69,53,75,0.6)',
    fontWeight: '500', lineHeight: 16,
  },

  termsOverlay: {
    flex: 1, backgroundColor: 'rgba(26,22,17,0.6)',
    justifyContent: 'center', alignItems: 'center',
    padding: 20,
  },
  termsModal: {
    backgroundColor: '#FFFFFF', borderRadius: 24,
    maxHeight: '90%', width: '100%', maxWidth: 520,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  termsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E0D0',
  },
  termsIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(245,200,66,0.12)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  termsTitle: {
    fontSize: 17, fontWeight: '800', color: '#1A1611',
  },
  termsSub: {
    fontSize: 11, color: '#8A8070', marginTop: 2,
  },
  termsBody: {
    paddingHorizontal: 20, paddingTop: 16, maxHeight: 380,
  },
  termsSection: {
    fontSize: 13, fontWeight: '700', color: '#1A1611',
    marginTop: 16, marginBottom: 6, letterSpacing: 0.2,
  },
  termsText: {
    fontSize: 13, color: '#5A5248', lineHeight: 21,
  },
  disclaimerBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  disclaimerIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#5A5248',
    lineHeight: 21,
    fontWeight: '500',
  },
  termsFooter: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#E8E0D0', gap: 14,
  },
  termsCheckRowModal: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  termsCheckLabelModal: {
    flex: 1, fontSize: 13, color: '#1A1611',
    fontWeight: '500', lineHeight: 19,
  },
  termsActions: {
    flexDirection: 'row', gap: 10,
  },
  termsBtnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E8E0D0', alignItems: 'center',
  },
  termsBtnCancelText: {
    fontSize: 14, fontWeight: '600', color: '#8A8070',
  },
  termsBtnAccept: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#1A1611', alignItems: 'center',
  },
  termsBtnAcceptText: {
    fontSize: 14, fontWeight: '700', color: '#FFFFFF',
  },

  // ── Custom Alert Modal ──
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,22,17,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1611',
  },
  alertMessage: {
    fontSize: 14,
    color: '#5A5248',
    lineHeight: 22,
    marginBottom: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1A1611',
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
  },
  alertButtonSingle: {
    flex: 1,
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertButtonTextCancel: {
    color: '#8A8070',
  },
});
