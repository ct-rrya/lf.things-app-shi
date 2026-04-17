import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Platform, useWindowDimensions, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/colors';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 16;
  const maxContentWidth = isWeb && width > 900 ? 720 : undefined;
  const headerTopPad = isWeb ? 20
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12
    : 56;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad };
}

// ── Category icon map ──────────────────────────────────────────
function getCategoryIcon(category) {
  switch (category) {
    case 'ID':
    case 'id':           return { icon: 'card',           color: '#5B8CFF' };
    case 'Keys':
    case 'keys':         return { icon: 'key',            color: '#E8A838' };
    case 'Laptop':
    case 'laptop':       return { icon: 'laptop',         color: '#6C63FF' };
    case 'Phone':
    case 'phone':        return { icon: 'phone-portrait', color: '#34C759' };
    case 'Water Bottle':
    case 'bottle':       return { icon: 'water',          color: '#32ADE6' };
    case 'Wallet':
    case 'wallet':       return { icon: 'wallet',         color: '#A2845E' };
    case 'Bag':
    case 'bag':          return { icon: 'bag',            color: '#FF6B6B' };
    case 'Watch':
    case 'watch':        return { icon: 'time',           color: '#636366' };
    case 'Headphones':
    case 'headphones':   return { icon: 'headset',        color: '#AF52DE' };
    default:             return { icon: 'cube',           color: colors.grape };
  }
}

export default function FoundReportDetail() {
  const { id } = useLocalSearchParams();
  const [foundItem, setFoundItem] = useState(null);
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchFoundItem();
  }, [id]);

  async function fetchFoundItem() {
    try {
      const { data: foundData, error: foundError } = await supabase
        .from('found_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (foundError) throw foundError;
      if (!foundData) { setError('Found report not found'); return; }
      setFoundItem(foundData);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: matchData } = await supabase
        .from('ai_matches')
        .select('*, lost_item:items!ai_matches_lost_item_id_fkey(id, name)')
        .eq('found_item_id', id)
        .eq('lost_item.user_id', user.id)
        .single();

      if (matchData) setMatchInfo(matchData);
    } catch (err) {
      console.error('Error fetching found item:', err);
      setError('Unable to load found report details');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!matchInfo) return;
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: matchError } = await supabase
        .from('ai_matches')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', matchInfo.id);
      if (matchError) throw matchError;

      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'located' })
        .eq('id', matchInfo.lost_item.id);
      if (itemError) throw itemError;

      const { error: foundError } = await supabase
        .from('found_items')
        .update({ status: 'claimed' })
        .eq('id', id);
      if (foundError) throw foundError;

      const { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('match_id', matchInfo.id)
        .single();

      let threadId;
      if (existingThread) {
        threadId = existingThread.id;
      } else {
        const { data: threadData, error: threadError } = await supabase
          .from('chat_threads')
          .insert({
            match_id: matchInfo.id,
            registered_item_id: matchInfo.lost_item.id,
            owner_id: user.id,
            finder_id: foundItem.reporter_id,
          })
          .select()
          .single();
        if (threadError) throw threadError;
        threadId = threadData.id;
      }

      router.push(`/chat/${threadId}`);
    } catch (err) {
      console.error('Error confirming match:', err);
      Alert.alert('Error', 'Failed to confirm match. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!matchInfo) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('ai_matches')
        .update({ status: 'rejected' })
        .eq('id', matchInfo.id);
      if (error) throw error;

      Alert.alert(
        'Match Dismissed',
        'This match has been marked as not yours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Error rejecting match:', err);
      Alert.alert('Error', 'Failed to dismiss match. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  // ── LOADING ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingDots}>
          <View style={[styles.loadingDot, { opacity: 1 }]} />
          <View style={[styles.loadingDot, { opacity: 0.6 }]} />
          <View style={[styles.loadingDot, { opacity: 0.3 }]} />
        </View>
        <Text style={[styles.loadingText, { fontSize: r.isTablet ? 14 : 13 }]}>
          Loading item details…
        </Text>
      </View>
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────
  if (error || !foundItem) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconOuter}>
          <View style={styles.emptyIconInner}>
            <Ionicons name="alert-circle-outline" size={r.isTablet ? 36 : 28} color={colors.ember} />
          </View>
        </View>
        <Text style={[styles.errorTitle, { fontSize: r.isTablet ? 22 : 18 }]}>
          Report Not Found
        </Text>
        <Text style={[styles.errorText, { fontSize: r.isTablet ? 14 : 12 }]}>
          This found report is invalid or has been removed from the system.
        </Text>
      </View>
    );
  }

  const { icon: catIcon, color: catColor } = getCategoryIcon(foundItem.category);
  const matchScore = matchInfo ? Math.round(matchInfo.match_score) : null;
  const scoreColor = matchScore >= 80 ? '#10b981' : matchScore >= 60 ? '#f59e0b' : '#6b7280';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.grape} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={[
          styles.headerInner,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={r.isTablet ? 20 : 18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>AI MATCH REVIEW</Text>
            <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 20 : 17 }]}>
              Possible Match Found
            </Text>
            <Text style={[styles.headerSub, { fontSize: r.isTablet ? 12 : 10 }]}>
              Review this found item report
            </Text>
          </View>
          {matchScore && (
            <View style={[styles.scoreHeaderBadge, { backgroundColor: scoreColor + '22', borderColor: scoreColor + '44' }]}>
              <Ionicons name="sparkles" size={12} color={scoreColor} />
              <Text style={[styles.scoreHeaderText, { color: scoreColor }]}>
                {matchScore}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerWave} />
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

        {/* ── ITEM CARD ──────────────────────────────────────── */}
        <View style={styles.card}>

          {/* Card header row */}
          <View style={styles.itemHeader}>
            <View style={[styles.itemIconWrap, { backgroundColor: catColor + '18' }]}>
              <Ionicons name={catIcon} size={r.isTablet ? 30 : 26} color={catColor} />
            </View>
            <View style={styles.itemHeaderText}>
              <Text style={styles.cardEyebrow}>FOUND ITEM</Text>
              <Text style={[styles.itemName, { fontSize: r.isTablet ? 19 : 17 }]}>
                {foundItem.category}
              </Text>
              {matchScore && (
                <View style={[styles.matchScoreBadge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '35' }]}>
                  <Ionicons name="sparkles" size={10} color={scoreColor} />
                  <Text style={[styles.matchScoreText, { color: scoreColor }]}>
                    {matchScore}% AI match confidence
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Photo */}
          {foundItem.photo_url && (
            <>
              <View style={styles.divider} />
              <Image
                source={{ uri: foundItem.photo_url }}
                style={[styles.mainPhoto, { height: r.isTablet ? 280 : 220 }]}
                resizeMode="cover"
              />
            </>
          )}

          {/* Details grid */}
          {(foundItem.brand || foundItem.model || foundItem.color || foundItem.size || foundItem.type) && (
            <>
              <View style={styles.divider} />
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: catColor }]} />
                <Text style={styles.sectionLabel}>Item Details</Text>
              </View>
              <View style={styles.detailsGrid}>
                {foundItem.brand && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>BRAND</Text>
                    <Text style={[styles.detailChipValue, { fontSize: r.isTablet ? 14 : 13 }]}>{foundItem.brand}</Text>
                  </View>
                )}
                {foundItem.model && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>MODEL</Text>
                    <Text style={[styles.detailChipValue, { fontSize: r.isTablet ? 14 : 13 }]}>{foundItem.model}</Text>
                  </View>
                )}
                {foundItem.color && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>COLOR</Text>
                    <Text style={[styles.detailChipValue, { fontSize: r.isTablet ? 14 : 13 }]}>{foundItem.color}</Text>
                  </View>
                )}
                {foundItem.size && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>SIZE</Text>
                    <Text style={[styles.detailChipValue, { fontSize: r.isTablet ? 14 : 13 }]}>{foundItem.size}</Text>
                  </View>
                )}
                {foundItem.type && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>TYPE</Text>
                    <Text style={[styles.detailChipValue, { fontSize: r.isTablet ? 14 : 13 }]}>{foundItem.type}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Description */}
          {foundItem.description && (
            <>
              <View style={styles.divider} />
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionLabel}>Additional Notes</Text>
              </View>
              <Text style={[styles.descriptionText, { fontSize: r.isTablet ? 14 : 13 }]}>
                {foundItem.description}
              </Text>
            </>
          )}
        </View>

        {/* ── LOCATION & DATE CARD ───────────────────────────── */}
        <View style={[styles.card, styles.locationCard]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.sectionLabel}>Where & When</Text>
          </View>

          <View style={styles.locationRows}>
            {foundItem.found_location && (
              <View style={styles.locationRow}>
                <View style={styles.locationRowIcon}>
                  <Ionicons name="location-outline" size={16} color="#8A8070" />
                </View>
                <View style={styles.locationRowBody}>
                  <Text style={styles.locationRowLabel}>FOUND AT</Text>
                  <Text style={[styles.locationRowValue, { fontSize: r.isTablet ? 14 : 13 }]}>
                    {foundItem.found_location}
                  </Text>
                </View>
              </View>
            )}
            {foundItem.found_date && (
              <View style={styles.locationRow}>
                <View style={styles.locationRowIcon}>
                  <Ionicons name="calendar-outline" size={16} color="#8A8070" />
                </View>
                <View style={styles.locationRowBody}>
                  <Text style={styles.locationRowLabel}>DATE FOUND</Text>
                  <Text style={[styles.locationRowValue, { fontSize: r.isTablet ? 14 : 13 }]}>
                    {new Date(foundItem.found_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
            {foundItem.created_at && (
              <View style={styles.locationRow}>
                <View style={styles.locationRowIcon}>
                  <Ionicons name="time-outline" size={16} color="#8A8070" />
                </View>
                <View style={styles.locationRowBody}>
                  <Text style={styles.locationRowLabel}>REPORTED</Text>
                  <Text style={[styles.locationRowValue, { fontSize: r.isTablet ? 14 : 13 }]}>
                    {new Date(foundItem.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── AI REASONING ───────────────────────────────────── */}
        {matchInfo?.match_details?.reasoning && (
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={styles.aiHeaderIcon}>
                <Ionicons name="sparkles" size={16} color={colors.gold} />
              </View>
              <View style={styles.aiHeaderText}>
                <Text style={styles.aiEyebrow}>AI ANALYSIS</Text>
                <Text style={[styles.aiTitle, { fontSize: r.isTablet ? 14 : 13 }]}>
                  Why this might be your item
                </Text>
              </View>
            </View>
            <View style={styles.aiDivider} />
            <Text style={[styles.aiText, { fontSize: r.isTablet ? 13 : 12 }]}>
              {matchInfo.match_details.reasoning}
            </Text>
          </View>
        )}

        {/* ── ACTION BUTTONS ─────────────────────────────────── */}
        {matchInfo && matchInfo.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <View style={styles.confirmButtonIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
              <Text style={[styles.confirmButtonText, { fontSize: r.isTablet ? 15 : 14 }]}>
                Yes, this is my item
              </Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleReject}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={r.isTablet ? 20 : 18} color="#8A8070" />
              <Text style={[styles.rejectButtonText, { fontSize: r.isTablet ? 14 : 13 }]}>
                Not my item
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STATUS BANNERS ─────────────────────────────────── */}
        {matchInfo && matchInfo.status === 'confirmed' && (
          <View style={styles.statusBanner}>
            <View style={styles.statusBannerIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
            <Text style={[styles.statusText, { fontSize: r.isTablet ? 14 : 12 }]}>
              You confirmed this match. Check the Chat tab to continue the conversation.
            </Text>
          </View>
        )}

        {matchInfo && matchInfo.status === 'rejected' && (
          <View style={[styles.statusBanner, styles.statusBannerRejected]}>
            <View style={[styles.statusBannerIcon, styles.statusBannerIconRejected]}>
              <Ionicons name="close-circle" size={20} color="#8A8070" />
            </View>
            <Text style={[styles.statusText, styles.statusTextRejected, { fontSize: r.isTablet ? 14 : 12 }]}>
              You marked this as not your item.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 28,
    gap: 10,
  },
  loadingDots: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grape },
  loadingText: { color: '#8A8070', fontWeight: '500' },

  emptyIconOuter: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(208,8,3,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(208,8,3,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(208,8,3,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontWeight: '900',
    color: colors.ember,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  errorText: {
    color: '#8A8070',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.grape,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -20,
  },
  headerBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,200,66,0.06)',
    top: 24,
    right: 64,
  },
  headerWave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 2 },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(245,200,66,0.65)',
    letterSpacing: 2,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.45)',
  },
  scoreHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  scoreHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── Shared card ──
  body: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 20, gap: 14 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  locationCard: {
    borderColor: 'rgba(245,200,66,0.3)',
  },

  // Shared section label
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grape,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A8070',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0EAE0',
  },

  // ── Item header ──
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  itemIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemHeaderText: { flex: 1, gap: 5, paddingTop: 2 },
  cardEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8070',
    letterSpacing: 1.5,
  },
  itemName: {
    fontWeight: '800',
    color: '#1A1611',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  matchScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  matchScoreText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Photo ──
  mainPhoto: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#F5F0E8',
  },

  // ── Details grid ──
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailChip: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 11,
    gap: 4,
  },
  detailChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8070',
    letterSpacing: 1.2,
  },
  detailChipValue: {
    color: '#1A1611',
    fontWeight: '600',
    lineHeight: 18,
  },

  descriptionText: {
    color: '#1A1611',
    lineHeight: 22,
  },

  // ── Location rows ──
  locationRows: { gap: 14 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  locationRowBody: { flex: 1, gap: 2 },
  locationRowLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8070',
    letterSpacing: 1.2,
  },
  locationRowValue: {
    color: '#1A1611',
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── AI Card ──
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiHeaderText: { flex: 1, gap: 2 },
  aiEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(245,200,66,0.8)',
    letterSpacing: 1.5,
  },
  aiTitle: {
    fontWeight: '700',
    color: '#1A1611',
  },
  aiDivider: {
    height: 1,
    backgroundColor: 'rgba(245,200,66,0.15)',
  },
  aiText: {
    color: '#1A1611',
    lineHeight: 21,
  },

  // ── Action Buttons ──
  actionButtons: { gap: 10 },

  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1611',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
  },
  rejectButtonText: {
    color: '#8A8070',
    fontWeight: '600',
  },

  // ── Status Banners ──
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16,
    padding: 14,
  },
  statusBannerRejected: {
    backgroundColor: 'rgba(107,114,128,0.07)',
    borderColor: 'rgba(107,114,128,0.18)',
  },
  statusBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusBannerIconRejected: {
    backgroundColor: 'rgba(107,114,128,0.1)',
  },
  statusText: {
    flex: 1,
    color: '#059669',
    lineHeight: 20,
    fontWeight: '600',
  },
  statusTextRejected: {
    color: '#6b7280',
  },
});