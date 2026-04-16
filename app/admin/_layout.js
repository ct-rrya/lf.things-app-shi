import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Platform, useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ADMIN_CODE = process.env.EXPO_PUBLIC_ADMIN_CODE || 'ctu-admin-2025';
const SESSION_KEY = 'lf_admin_unlocked';

const NAV = [
  { name: 'index',    label: 'Dashboard',  icon: 'grid-outline' },
  { name: 'students', label: 'Students',   icon: 'people-outline' },
  { name: 'items',    label: 'All Items',  icon: 'cube-outline' },
  { name: 'custody',  label: 'Custody',    icon: 'archive-outline' },
  { name: 'audit',    label: 'Audit Log',  icon: 'document-text-outline' },
];

// ── Passcode gate ──────────────────────────────────────────────
function PasscodeGate({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit() {
    if (code === ADMIN_CODE) {
      if (Platform.OS === 'web') localStorage.setItem(SESSION_KEY, '1');
      onUnlock();
    } else {
      setError('Incorrect passcode');
      setShake(true);
      setCode('');
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <View style={gate.container}>
      <View style={[gate.card, shake && gate.cardShake]}>
        <View style={gate.iconWrap}>
          <Ionicons name="shield-checkmark" size={32} color="#1A1611" />
        </View>
        <Text style={gate.title}>Admin Portal</Text>
        <Text style={gate.sub}>CTU Daanbantayan — Lost & Found</Text>

        <View style={gate.inputWrap}>
          <Ionicons name="lock-closed-outline" size={16} color="#8A8070" />
          <TextInput
            style={gate.input}
            placeholder="Enter admin passcode"
            placeholderTextColor="#B8AFA4"
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {error ? <Text style={gate.error}>{error}</Text> : null}

        <TouchableOpacity style={gate.btn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={gate.btnText}>Enter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ onLock }) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const collapsed = width < 1100;

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
        <View style={styles.brandIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#1A1611" />
        </View>
        {!collapsed && (
          <View>
            <Text style={styles.brandName}>LF Admin</Text>
            <Text style={styles.brandSub}>CTU Daanbantayan</Text>
          </View>
        )}
      </View>

      <View style={styles.nav}>
        {NAV.map((item) => {
          const active = pathname === `/admin/${item.name}` ||
            (item.name === 'index' && (pathname === '/admin' || pathname === '/admin/'));
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.name === 'index' ? '/admin' : `/admin/${item.name}`)}
              activeOpacity={0.75}
            >
              <Ionicons name={item.icon} size={18} color={active ? '#1A1611' : '#8A8070'} />
              {!collapsed && (
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.lockBtn} onPress={onLock} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={18} color="#8A8070" />
          {!collapsed && <Text style={styles.lockText}>Lock</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Root layout ────────────────────────────────────────────────
export default function AdminLayout() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on web
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved === '1') setUnlocked(true);
    }
    setChecking(false);
  }, []);

  function handleLock() {
    if (Platform.OS === 'web') localStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }

  if (checking) return null;

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <View style={styles.root}>
      <Sidebar onLock={handleLock} />
      <View style={styles.main}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

// ── Gate styles ────────────────────────────────────────────────
const gate = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1611',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F5C842',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  sub: { fontSize: 12, color: '#8A8070', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1611',
    ...(Platform.OS === 'web' && { outlineWidth: 0 }),
  },
  error: { fontSize: 12, color: '#E53935', fontWeight: '600' },
  btn: {
    backgroundColor: '#1A1611',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

// ── Layout styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F5F0E8' },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E8E0D0',
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  sidebarCollapsed: { width: 60, paddingHorizontal: 8, alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, paddingHorizontal: 4 },
  brandCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  brandIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5C842',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  brandName: { fontSize: 15, fontWeight: '800', color: '#1A1611' },
  brandSub: { fontSize: 10, color: '#8A8070', marginTop: 1 },
  nav: { flex: 1, gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
  },
  navItemActive: { backgroundColor: '#F5C842' },
  navLabel: { fontSize: 13, fontWeight: '500', color: '#8A8070' },
  navLabelActive: { color: '#1A1611', fontWeight: '700' },
  sidebarFooter: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E8E0D0' },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8 },
  lockText: { fontSize: 13, color: '#8A8070', fontWeight: '500' },
  main: { flex: 1, overflow: 'hidden' },
});
