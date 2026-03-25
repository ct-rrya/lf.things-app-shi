import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../styles/colors';
import SplashScreen from '../components/SplashScreen';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashScreen />;

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
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
      Alert.alert('Sign In Failed',
        err.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!studentId.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // Verify student ID in master list
      const { data: student, error: lookupErr } = await supabase
        .from('students')
        .select('id, status, auth_user_id')
        .eq('student_id', studentId.trim())
        .maybeSingle();

      if (lookupErr || !student) {
        Alert.alert('Not in the System',
          'Your Student ID was not found. Contact the Student Affairs Office.');
        return;
      }
      if (student.status !== 'active') {
        Alert.alert('Inactive', 'Your student record is inactive. Contact the Student Affairs Office.');
        return;
      }
      if (student.auth_user_id) {
        Alert.alert('Already Registered', 'This Student ID already has an account. Please sign in.');
        setMode('login');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: undefined },
      });
      if (error) throw error;

      if (data.user) {
        await supabase
          .from('students')
          .update({ auth_user_id: data.user.id, email: email.trim() })
          .eq('student_id', studentId.trim());
      }

      Alert.alert('Account Created', 'You can now sign in with your email and password.');
      setMode('login');
      setStudentId('');
      setPassword('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <View style={styles.container}>
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
              SOS<Text style={styles.logoEmber}>.</Text>things
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
                  <Text style={styles.inputLabel}>STUDENT ID</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="card-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 21-12345"
                      placeholderTextColor="rgba(69,53,75,0.35)"
                      value={studentId}
                      onChangeText={setStudentId}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {/* Email — both modes */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={15} color="rgba(69,53,75,0.35)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(69,53,75,0.35)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password — both modes */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
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
            </View>
          </View>

          <Text style={styles.footer}>SOS but for things · v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.ember, padding: 15, borderRadius: 12, marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: 'rgba(222,207,157,0.25)', fontSize: 11, marginTop: 28 },
});
