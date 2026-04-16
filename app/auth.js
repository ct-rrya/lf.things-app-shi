import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, components } from '../styles/theme';
import { validateStudentId, CTU_PROGRAMS, CTU_YEAR_LEVELS, CTU_INFO } from '../lib/ctuConstants';

export default function Auth() {
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  async function handleAuth() {
    if (isSignUp) {
      // Sign Up validation
      if (!studentId || !fullName || !email || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Validate Student ID
      const validation = validateStudentId(studentId);
      if (!validation.valid) {
        Alert.alert('Invalid Student ID', validation.error);
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      if (!program || !yearLevel) {
        Alert.alert('Error', 'Please select your program and year level');
        return;
      }

      setLoading(true);
      try {
        // ── Verify student ID exists in master list ──────────
        const { data: studentRecord, error: lookupError } = await supabase
          .from('students')
          .select('id, status, full_name')
          .eq('student_id', studentId.trim())
          .single();

        if (lookupError || !studentRecord) {
          Alert.alert(
            'Not in the System',
            'Your Student ID was not found in the CTU Daanbantayan master list. Please contact the Student Affairs Office to be registered.'
          );
          setLoading(false);
          return;
        }

        if (studentRecord.status !== 'active') {
          Alert.alert(
            'Account Inactive',
            'Your student record is currently inactive. Please contact the Student Affairs Office.'
          );
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              student_id: studentId,
              name: fullName,
              program: program,
              year_level: yearLevel,
              section: section,
            },
            emailRedirectTo: undefined,
          },
        });

        if (error) throw error;

        // Update profile with additional info
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            student_id: studentId,
            full_name: fullName,
            program: program,
            year_level: yearLevel,
            section: section,
          });
          // Link auth user to master list record
          await supabase
            .from('students')
            .update({ auth_user_id: data.user.id })
            .eq('student_id', studentId.trim());
        }

        Alert.alert('Success', 'Account created! You can now sign in.');
        setIsSignUp(false);
        // Clear form
        setStudentId('');
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setProgram('');
        setYearLevel('');
        setSection('');
      } catch (error) {
        Alert.alert('Error', error.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In validation
      if (!email || !password) {
        Alert.alert('Error', 'Please enter your email and password');
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)/home');
      } catch (error) {
        Alert.alert('Error', error.message || 'Sign in failed');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Ionicons name="school-outline" size={48} color={colors.accent} />
            </View>
          </View>
          
          <Text style={styles.label}>LOST & FOUND SYSTEM</Text>
          <Text style={styles.title}>
            LF<Text style={styles.titleDot}>.</Text>things
          </Text>
          <Text style={styles.subtitle}>{CTU_INFO.tagline}</Text>
          <Text style={styles.campus}>For CTU Daanbantayan Students Only</Text>
        </View>

        <View style={styles.form}>
          {isSignUp ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student ID Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 21-12345"
                  placeholderTextColor={colors.muted}
                  value={studentId}
                  onChangeText={setStudentId}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan Dela Cruz"
                  placeholderTextColor={colors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Program *</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Year Level *</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Section (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 3A"
                  placeholderTextColor={colors.muted}
                  value={section}
                  onChangeText={setSection}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </>
          )}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'LOADING...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsSignUp(!isSignUp)} 
            style={styles.switchButton}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 80 : (StatusBar.currentHeight || 24) + 40,
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.dark,
    letterSpacing: 0.5,
  },
  titleDot: {
    color: colors.danger,
  },
  subtitle: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  campus: {
    ...typography.small,
    marginTop: spacing.xs,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.dark,
  },
  input: {
    ...components.input,
    fontSize: 15,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  pickerOptionText: {
    ...typography.body,
    fontSize: 14,
    color: colors.dark,
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
    color: colors.dark,
  },
  button: {
    ...components.button.danger,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...components.button.dangerText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchText: {
    ...typography.small,
    opacity: 0.7,
  },
});
