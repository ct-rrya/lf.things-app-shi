import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, ScrollView, StatusBar, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { colors } from '../../styles/colors';

// DiceBear avatar — deterministic from seed string
function getAvatarUrl(seed) {
  const s = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}&backgroundColor=f5c842&radius=50`;
}

export default function Profile() {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const router = useRouter();

  useEffect(() => { loadUserData(); }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email);

      const { data: studentData } = await supabase
        .from('students')
        .select('full_name, program, year_level, section, student_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('bio, avatar_seed, display_name')
        .eq('id', user.id)
        .maybeSingle();

      setProfile({
        full_name: studentData?.full_name || user.email,
        student_id: studentData?.student_id,
        program: studentData?.program,
        year_level: studentData?.year_level,
        section: studentData?.section,
        bio: profileData?.bio || '',
        avatar_seed: profileData?.avatar_seed || studentData?.student_id || user.id,
        display_name: profileData?.display_name || studentData?.full_name || '',
      });

      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setItemCount(count || 0);
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setShowSignOutModal(false);
    try {
      await supabase.auth.signOut();
      if (Platform.OS === 'web') {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-')) localStorage.removeItem(k);
        });
      }
      router.replace('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  const displayName = profile?.display_name || profile?.full_name || email;
  const avatarUrl = getAvatarUrl(profile?.avatar_seed || email);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1611" />

      {/* ── HERO ── */}
      <View style={styles.hero}>
        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />

        <View style={styles.heroTopBar}>
          <View>
            <Text style={styles.heroEyebrow}>ACCOUNT</Text>
            <Text style={styles.heroAppName}>
              LF<Text style={styles.heroAppDot}>.</Text>things
            </Text>
          </View>
          {/* Edit button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/account-settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.gold} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => router.push('/account-settings')}
            activeOpacity={0.85}
          >
            {Platform.OS === 'web' ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <SvgUri
                uri={avatarUrl}
                width="100%"
                height="100%"
              />
            )}
          </TouchableOpacity>

          <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>

          {profile?.bio ? (
            <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
          ) : null}

          <View style={styles.pillRow}>
            {profile?.student_id && (
              <View style={styles.pill}>
                <Ionicons name="card-outline" size={10} color={colors.gold} />
                <Text style={styles.pillText}>{profile.student_id}</Text>
              </View>
            )}
            {profile?.program && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{profile.program}</Text>
              </View>
            )}
            {profile?.year_level && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{profile.year_level}</Text>
              </View>
            )}
          </View>

          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
            <Text style={styles.verifiedText}>CTU Daanbantayan Student</Text>
          </View>
        </View>

        <View style={styles.heroWave} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{itemCount}</Text>
            <Text style={styles.statLabel}>Items{'\n'}Registered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={22} color="#10b981" />
            <Text style={styles.statLabel}>Verified{'\n'}Student</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={22} color={colors.gold} />
            <Text style={styles.statLabel}>Credits{'\n'}Soon</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.sectionsWrap}>

          <View style={styles.sectionGroup}>
            <Text style={styles.groupLabel}>Account</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardRow}
                onPress={() => router.push('/account-settings')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(69,53,75,0.07)' }]}>
                  <Ionicons name="person-outline" size={15} color="#1A1611" />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>Account Settings</Text>
                  <Text style={styles.rowSub}>Name, bio, avatar, email</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#D0C8BC" />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.cardRow}
                onPress={() => router.push('/(tabs)/my-items')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(245,200,66,0.12)' }]}>
                  <Ionicons name="cube-outline" size={15} color={colors.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>My Registered Items</Text>
                  <Text style={styles.rowSub}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#D0C8BC" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionGroup}>
            <Text style={styles.groupLabel}>About</Text>
            <View style={styles.card}>
              {[
                { label: 'App', value: 'LF — Lost & Found' },
                { label: 'Campus', value: 'CTU Daanbantayan' },
                { label: 'Version', value: 'v1.0.0' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.aboutRow, i < arr.length - 1 && styles.aboutRowBorder]}>
                  <Text style={styles.aboutLabel}>{row.label}</Text>
                  <Text style={styles.aboutValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>

        {/* Sign Out */}
        <View style={styles.signOutWrap}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => setShowSignOutModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={16} color="#E53935" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>LF but for things · v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sign Out Modal */}
      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color="#E53935" />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Are you sure you want to sign out of LF.things?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSignOutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSignOut}>
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  hero: {
    backgroundColor: '#1A1611',
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  heroBlob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)', top: -60, right: -50 },
  heroBlob2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,200,66,0.06)', top: 20, right: 60 },
  heroWave: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 24, backgroundColor: '#F5F0E8', borderTopLeftRadius: 28, borderTopRightRadius: 28 },

  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 24 },
  heroEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(245,200,66,0.6)', letterSpacing: 2, marginBottom: 3 },
  heroAppName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  heroAppDot: { color: '#E53935' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,200,66,0.12)', borderWidth: 1, borderColor: 'rgba(245,200,66,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.gold },

  avatarBlock: { alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2.5, borderColor: 'rgba(245,200,66,0.4)', overflow: 'hidden', marginBottom: 4 },
  avatarImg: { width: '100%', height: '100%', backgroundColor: colors.gold },
  displayName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' },
  bio: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 17, maxWidth: 260 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },

  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#10b981', letterSpacing: 0.3 },

  scrollContent: { paddingBottom: 20 },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E8E0D0', paddingVertical: 18 },
  statCard: { flex: 1, alignItems: 'center', gap: 6 },
  statNumber: { fontSize: 26, fontWeight: '900', color: '#1A1611', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#8A8070', textAlign: 'center', lineHeight: 14 },
  statDivider: { width: 1, height: 36, backgroundColor: '#E8E0D0' },

  sectionsWrap: { paddingHorizontal: 16, marginTop: 20, gap: 20 },
  sectionGroup: { gap: 8 },
  groupLabel: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 1.2, textTransform: 'uppercase', paddingLeft: 4 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowDivider: { height: 1, backgroundColor: '#F5F0E8', marginHorizontal: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1A1611' },
  rowSub: { fontSize: 12, color: '#8A8070' },

  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  aboutRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  aboutLabel: { fontSize: 12, color: '#8A8070', fontWeight: '500' },
  aboutValue: { fontSize: 12, color: '#1A1611', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },

  signOutWrap: { marginTop: 20, paddingHorizontal: 16 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#FFCDD2' },
  signOutText: { fontSize: 14, color: '#E53935', fontWeight: '700' },

  version: { fontSize: 11, textAlign: 'center', color: 'rgba(69,53,75,0.25)', marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,22,17,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', gap: 10 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1611' },
  modalSub: { fontSize: 13, color: '#8A8070', textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F5F0E8', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#1A1611' },
  modalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#E53935', alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
