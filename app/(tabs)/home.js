// Main dashboard after login

/*
Functions:
    •	fetchUserData(): Gets user name from profiles -> user_metadata -> students
    •	extractFirstName(): Handles Filipino naming convention (SURNAME FIRSTNAME)
    •	fetchStats(): Counts items by status and pending matches
    •	fetchRecentActivity(): Gets recent match notifications
    •	openLostModal(): Shows user's items to mark as lost
*/

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, useWindowDimensions, StatusBar, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, components } from '../../styles/theme';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 16;
  const maxContentWidth = isWeb && width > 900 ? 860 : undefined;
  const headerTopPad = isWeb ? 16
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 52;
  const fontScale = isTablet ? 1.1 : 1;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale };
}

export default function Home() {
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ lost: 0, matches: 0, safe: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLostModal, setShowLostModal] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [markingLost, setMarkingLost] = useState(null);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRecentActivity();

    // Real-time: re-fetch stats when items or matches change
    let itemSub, matchSub, profileSub;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      itemSub = supabase
        .channel('home_items_rt')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'items',
          filter: `user_id=eq.${user.id}`,
        }, () => { fetchStats(); fetchRecentActivity(); })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Items subscription error - retrying...');
            setTimeout(() => fetchStats(), 2000);
          }
        });

      matchSub = supabase
        .channel('home_matches_rt')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'ai_matches',
        }, () => { fetchStats(); fetchRecentActivity(); })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Matches subscription error - retrying...');
            setTimeout(() => fetchStats(), 2000);
          }
        });

      profileSub = supabase
        .channel('home_profile_rt')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, () => { fetchUserData(); })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Profile subscription error - retrying...');
            setTimeout(() => fetchUserData(), 2000);
          }
        });
    });

    return () => {
      if (itemSub) supabase.removeChannel(itemSub);
      if (matchSub) supabase.removeChannel(matchSub);
      if (profileSub) supabase.removeChannel(profileSub);
    };
  }, []);

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check profiles table first for display_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.display_name) {
        setUserName(extractFirstName(profile.display_name));
        return;
      }

      // Fall back to user_metadata
      if (user.user_metadata?.name) {
        setUserName(extractFirstName(user.user_metadata.name));
        return;
      }

      // Finally, look up from students master list
      const { data: student } = await supabase
        .from('students')
        .select('full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (student?.full_name) {
        setUserName(extractFirstName(student.full_name));
        return;
      }

      // Last resort: use email username
      if (user.email) {
        setUserName(user.email.split('@')[0]);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }

  // Helper function to extract first name from full name
  // Handles formats like "SURNAME FIRSTNAME MIDDLEINITIAL" or "Firstname Lastname"
  function extractFirstName(fullName) {
    if (!fullName) return '';
    
    const parts = fullName.trim().split(/\s+/);
    let firstName = '';
    
    // If all caps (like "CABAGTE MONICK R"), assume format is SURNAME FIRSTNAME MIDDLE
    // So take the second part
    if (fullName === fullName.toUpperCase() && parts.length >= 2) {
      firstName = parts[1]; // Return the first name (second word)
    } else {
      // Otherwise assume normal format "Firstname Lastname"
      firstName = parts[0];
    }
    
    // Convert to Title Case (first letter capital, rest lowercase)
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }

  async function fetchStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get user's item IDs first
      const { data: ownedItems } = await supabase
        .from('items')
        .select('id, status')
        .eq('user_id', user.id);

      const itemIds = (ownedItems || []).map(i => i.id);
      const lostCount = (ownedItems || []).filter(i => i.status === 'lost').length;
      const safeCount = (ownedItems || []).filter(i => i.status === 'safe').length;

      let matchCount = 0;
      if (itemIds.length > 0) {
        const { count } = await supabase
          .from('ai_matches')
          .select('*', { count: 'exact', head: true })
          .in('lost_item_id', itemIds)
          .eq('status', 'pending');
        matchCount = count || 0;
      }

      setStats({ lost: lostCount, matches: matchCount, safe: safeCount });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentActivity() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get user's item IDs first, then filter matches by those
      const { data: userItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', user.id);

      const itemIds = (userItems || []).map(i => i.id);
      if (itemIds.length === 0) { setRecentActivity([]); return; }

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

      const activities = (matches || [])
        .filter(match => match.lost_item?.name)
        .map(match => ({
          id: match.id,
          type: 'match',
          message: `Your ${match.lost_item.name} has a possible match`,
          time: match.created_at,
          icon: 'sparkles',
          color: colors.gold,
        }));

      setRecentActivity(activities);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  async function openLostModal() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('items')
        .select('id, name, category, status, photo_urls')
        .eq('user_id', user.id)
        .neq('status', 'lost')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        Alert.alert(
          'No Items Registered',
          'You need to register an item first before marking it as lost.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Item', onPress: () => router.push('/(tabs)/register') },
          ]
        );
        return;
      }
      setUserItems(data);
      setShowLostModal(true);
    } catch (err) {
      Alert.alert('Error', 'Could not load your items');
    }
  }

  async function markItemAsLost(item) {
    setMarkingLost(item.id);
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'lost' })
        .eq('id', item.id);
      if (error) throw error;
      setShowLostModal(false);
      setMarkingLost(null);
      fetchStats();
      Alert.alert('Marked as Lost', `"${item.name}" has been marked as lost. You'll be notified if someone finds it.`);
    } catch (err) {
      setMarkingLost(null);
      Alert.alert('Error', 'Could not update item status');
    }
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
        {/* Decorative circle accent */}
        <View style={styles.headerAccentCircle} />
        <View style={styles.headerAccentCircle2} />

        <View style={[
          styles.headerInner,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingLabel}>{getGreeting().toUpperCase()}</Text>
              <Text style={[styles.greeting, { fontSize: r.isTablet ? 28 : 24 }]}>
                {userName ? `Hello, ${userName} 👋` : 'Hello there 👋'}
              </Text>
              <Text style={styles.subGreeting}>
                Here's a summary of your activity
              </Text>
            </View>
            <View style={styles.headerBadge}>
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── QUICK ACTIONS ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.actionButtons}>
            {/* I Lost Something */}
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={openLostModal}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.actionIconWrapPrimary}>
                  <Ionicons name="alert-circle" size={r.isTablet ? 28 : 24} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionButtonTitle}>I Lost Something</Text>
                  <Text style={styles.actionButtonSub}>Register a lost item</Text>
                </View>
                <View style={styles.actionChevron}>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
              {/* decorative dots */}
              <View style={styles.actionDotTL} />
              <View style={styles.actionDotBR} />
            </TouchableOpacity>

            {/* Report Found */}
            <TouchableOpacity
              style={styles.actionButtonFound}
              onPress={() => router.push('/(tabs)/report-found')}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.actionIconWrapFound}>
                  <Ionicons name="checkmark-circle" size={r.isTablet ? 28 : 24} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionButtonTitle}>I Found Something</Text>
                  <Text style={styles.actionButtonSub}>Report a found item</Text>
                </View>
                <View style={styles.actionChevron}>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Scan QR */}
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => router.push('/qr-scanner')}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonContent}>
                <View style={styles.actionIconWrapSecondary}>
                  <Ionicons name="qr-code-outline" size={r.isTablet ? 28 : 24} color={colors.accent} />
                </View>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionButtonTitleDark}>Scan QR Code</Text>
                  <Text style={styles.actionButtonSubDark}>Find an item owner</Text>
                </View>
                <View style={styles.actionChevronDark}>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SUMMARY CARDS ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>

          <View style={styles.summaryCards}>
            {/* Lost */}
            <TouchableOpacity
              style={[styles.summaryCard, styles.summaryCardRed]}
              onPress={() => router.push('/(tabs)/my-items')}
              activeOpacity={0.8}
            >
              <View style={[styles.summaryIconBg, { backgroundColor: `${colors.danger}15` }]}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.summaryCount, { color: colors.danger }]}>
                {stats.lost}
              </Text>
              <Text style={styles.summaryLabel}>Lost{'\n'}Items</Text>
              <View style={[styles.summaryBar, { backgroundColor: colors.danger }]} />
            </TouchableOpacity>

            {/* Safe */}
            <TouchableOpacity
              style={[styles.summaryCard, styles.summaryCardGreen]}
              onPress={() => router.push('/(tabs)/my-items')}
              activeOpacity={0.8}
            >
              <View style={[styles.summaryIconBg, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={[styles.summaryCount, { color: colors.success }]}>
                {stats.safe}
              </Text>
              <Text style={styles.summaryLabel}>Safe{'\n'}Items</Text>
              <View style={[styles.summaryBar, { backgroundColor: colors.success }]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── LOST ITEM PICKER MODAL ─────────────────────────── */}
      <Modal
        visible={showLostModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Which item did you lose?</Text>
                <Text style={styles.modalSub}>Select an item to mark as lost</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLostModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={userItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => markItemAsLost(item)}
                  disabled={markingLost === item.id}
                  activeOpacity={0.75}
                >
                  <View style={styles.modalItemIcon}>
                    <Ionicons name="cube-outline" size={20} color={colors.dark} />
                  </View>
                  <View style={styles.modalItemBody}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemCat}>{item.category}</Text>
                  </View>
                  {markingLost === item.id
                    ? <Text style={styles.modalItemLoading}>…</Text>
                    : <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  }
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.modalRegisterBtn}
                  onPress={() => { setShowLostModal(false); router.push('/(tabs)/register'); }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.dark} />
                  <Text style={styles.modalRegisterText}>Register a new item instead</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },

  // ── Header ──
  header: {
    backgroundColor: '#F5F0E8',
    paddingBottom: 24,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  headerAccentCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245,200,66,0.08)',
    top: -40,
    right: -40,
  },
  headerAccentCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,200,66,0.05)',
    top: 20,
    right: 60,
  },
  headerInner: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5C842',
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1611',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 13,
    color: '#8A8070',
    fontWeight: '400',
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245,200,66,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    marginTop: 16,
  },

  // ── Body ──
  body: { flex: 1 },
  content: {
    paddingTop: 24,
    paddingBottom: 24,
  },

  // ── Section ──
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5C842',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },

  // ── Quick Actions ──
  actionButtons: {
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#1A1611',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonFound: {
    backgroundColor: '#10b981',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  actionIconWrapPrimary: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245,200,66,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  actionIconWrapFound: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  actionIconWrapSecondary: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245,200,66,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '400',
  },
  actionButtonTitleDark: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: -0.2,
  },
  actionButtonSubDark: {
    fontSize: 12,
    color: '#8A8070',
    fontWeight: '400',
  },
  actionChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionChevronDark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // decorative dots on primary button
  actionDotTL: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: -20,
    right: 80,
  },
  actionDotBR: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.06)',
    bottom: -30,
    right: -20,
  },

  // ── Summary Cards ──
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  summaryCardRed: {
    borderColor: 'rgba(229,57,53,0.15)',
  },
  summaryCardYellow: {
    borderColor: 'rgba(245,200,66,0.25)',
  },
  summaryCardGreen: {
    borderColor: 'rgba(67,160,71,0.15)',
  },
  summaryIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryCount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
    lineHeight: 34,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8A8070',
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 10,
  },
  summaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    opacity: 0.5,
  },

  // ── Activity count badge ──
  activityCountBadge: {
    backgroundColor: '#F5C842',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  activityCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1611',
  },

  // ── Recent Activity ──
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    overflow: 'hidden',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  activityMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1611',
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.7,
  },
  activityTime: {
    fontSize: 11,
    color: '#8A8070',
    fontWeight: '400',
  },

  // ── Empty State ──
  emptyActivity: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyActivityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1611',
  },
  emptyActivityText: {
    fontSize: 13,
    color: '#8A8070',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Lost Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,22,17,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 32,
    width: Platform.OS === 'web' ? 480 : '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.dark,
  },
  modalSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    padding: spacing.md,
    gap: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalItemBody: { flex: 1 },
  modalItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  modalItemCat: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  modalItemLoading: {
    fontSize: 16,
    color: colors.muted,
  },
  modalRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  modalRegisterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
});