import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, Platform,
  useWindowDimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { colors } from '../../styles/colors';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 14;
  const maxContentWidth = isWeb && width > 900 ? 860 : undefined;
  const headerTopPad = isWeb ? 16
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 52;
  const fontScale = isTablet ? 1.1 : 1;
  const listColumns = isTablet && width >= 900 ? 2 : 1;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale, listColumns };
}

export default function Notifications() {
  const [scans, setScans] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scanEvents, setScanEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ── LOGIC (unchanged) ──────────────────────────────────────────
  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's item IDs first
      const { data: userItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', user.id);

      const itemIds = (userItems || []).map(i => i.id);

      if (itemIds.length === 0) {
        setScans([]);
        setScanEvents([]);
        setMatches([]);
        setLoading(false);
        return;
      }

      const [scansRes, scanEventsRes, matchesRes] = await Promise.all([
        supabase
          .from('qr_scans')
          .select('*, items(id, name, category)')
          .in('item_id', itemIds)
          .order('scanned_at', { ascending: false }),

        supabase
          .from('scan_events')
          .select('*, items(id, name, category)')
          .in('item_id', itemIds)
          .order('created_at', { ascending: false }),

        supabase
          .from('ai_matches')
          .select(`
            *,
            lost_item:items!ai_matches_lost_item_id_fkey(id, name, category, description),
            found_item:found_items(id, category, brand, model, color, type, description, photo_url, found_location, found_date)
          `)
          .in('lost_item_id', itemIds)
          .order('created_at', { ascending: false }),
      ]);

      setScans(scansRes.data || []);
      setScanEvents(scanEventsRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
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
  // ── END LOGIC ──────────────────────────────────────────────────

  function renderScan({ item: scan }) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardScan, r.listColumns === 2 && styles.cardGrid]}
        onPress={() => router.push(`/item/${scan.items.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardAccentBar} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrap, styles.cardIconWrapScan]}>
            <Ionicons name="qr-code-outline" size={r.isTablet ? 20 : 17} color={colors.gold} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTypeBadgeLabel}>QR SCAN</Text>
            <Text style={[styles.cardTitle, { fontSize: 13 * r.fontScale }]} numberOfLines={2}>
              Someone scanned your{' '}
              <Text style={styles.cardItemName}>{scan.items?.name}</Text>
            </Text>
          </View>
          <Text style={styles.cardTime}>{formatDate(scan.scanned_at)}</Text>
        </View>

        <View style={styles.cardDivider} />

        {/* Details */}
        {scan.scan_location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={12} color="#8A8070" />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={1}>
              {scan.scan_location}
            </Text>
          </View>
        )}
        {scan.scanner_message && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={12} color="#8A8070" />
            <Text style={styles.detailLabel}>Message</Text>
            <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={2}>
              {scan.scanner_message}
            </Text>
          </View>
        )}

        <View style={styles.cardCTA}>
          <Text style={[styles.cardCTAText, { color: '#B8870A' }]}>View Item</Text>
          <Ionicons name="arrow-forward" size={13} color="#B8870A" />
        </View>
      </TouchableOpacity>
    );
  }

  function renderMatch({ item: match }) {
    const matchScore = Math.round(match.match_score);
    const scoreColor = matchScore >= 80 ? '#059669' : matchScore >= 60 ? '#d97706' : '#6b7280';
    const scoreBg = matchScore >= 80 ? 'rgba(5,150,105,0.1)' : matchScore >= 60 ? 'rgba(217,119,6,0.1)' : 'rgba(107,114,128,0.1)';

    return (
      <TouchableOpacity
        style={[styles.card, styles.cardMatch, r.listColumns === 2 && styles.cardGrid]}
        onPress={() => router.push(`/found/${match.found_item.id}`)}
        activeOpacity={0.75}
      >
        <View style={[styles.cardAccentBar, { backgroundColor: colors.ember }]} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrap, styles.cardIconWrapMatch]}>
            <Ionicons name="sparkles" size={r.isTablet ? 20 : 17} color={colors.ember} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTypeBadgeLabel, { color: colors.ember }]}>AI MATCH</Text>
            <Text style={[styles.cardTitle, { fontSize: 13 * r.fontScale }]} numberOfLines={2}>
              Possible match for your{' '}
              <Text style={styles.cardItemName}>{match.lost_item?.name}</Text>
            </Text>
          </View>
          <View style={styles.cardTimeCol}>
            <View style={[styles.scorePill, { backgroundColor: scoreBg }]}>
              <Text style={[styles.scorePillText, { color: scoreColor }]}>{matchScore}%</Text>
            </View>
            <Text style={styles.cardTime}>{formatDate(match.created_at)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Found item details */}
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={12} color="#8A8070" />
          <Text style={styles.detailLabel}>Found</Text>
          <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={2}>
            {match.found_item?.brand && `${match.found_item.brand} `}
            {match.found_item?.model && `${match.found_item.model} `}
            {match.found_item?.color && `(${match.found_item.color})`}
          </Text>
        </View>
        {match.found_item?.found_location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={12} color="#8A8070" />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={1}>
              {match.found_item.found_location}
            </Text>
          </View>
        )}
        {match.match_details?.reasoning && (
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={12} color="#8A8070" />
            <Text style={styles.detailLabel}>AI Says</Text>
            <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={3}>
              {match.match_details.reasoning}
            </Text>
          </View>
        )}

        <View style={styles.cardCTA}>
          <Text style={[styles.cardCTAText, { color: colors.ember }]}>View Details</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.ember} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderScanEvent({ item: event }) {
    const actionLabels = {
      have_it: 'has your item with them',
      turned_in: 'turned it in',
      left_it: 'left it where they found it',
      contact_owner: 'wants to contact you',
    };
    const actionIcons = {
      have_it: 'hand-right-outline',
      turned_in: 'business-outline',
      left_it: 'location-outline',
      contact_owner: 'chatbubble-outline',
    };
    const finderName = event.finder_name || 'Someone';
    const actionText = actionLabels[event.action] || 'reported finding your item';

    return (
      <TouchableOpacity
        style={[styles.card, styles.cardFound, r.listColumns === 2 && styles.cardGrid]}
        onPress={() => router.push(`/item/${event.items.id}`)}
        activeOpacity={0.75}
      >
        <View style={[styles.cardAccentBar, { backgroundColor: '#10b981' }]} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrap, styles.cardIconWrapFound]}>
            <Ionicons name={actionIcons[event.action]} size={r.isTablet ? 20 : 17} color="#10b981" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTypeBadgeLabel, { color: '#059669' }]}>ITEM FOUND 🎉</Text>
            <Text style={[styles.cardTitle, { fontSize: 13 * r.fontScale }]} numberOfLines={2}>
              Your <Text style={styles.cardItemName}>{event.items?.name}</Text> was found!
            </Text>
          </View>
          <Text style={styles.cardTime}>{formatDate(event.created_at)}</Text>
        </View>

        <View style={styles.cardDivider} />

        {/* Details */}
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={12} color="#8A8070" />
          <Text style={styles.detailLabel}>Finder</Text>
          <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={1}>
            {finderName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name={actionIcons[event.action]} size={12} color="#8A8070" />
          <Text style={styles.detailLabel}>Action</Text>
          <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={2}>
            {actionText}
          </Text>
        </View>
        {event.location_note && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={12} color="#8A8070" />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={[styles.detailValue, { fontSize: 11 * r.fontScale }]} numberOfLines={2}>
              {event.location_note}
            </Text>
          </View>
        )}

        <View style={styles.cardCTA}>
          <Text style={[styles.cardCTAText, { color: '#059669' }]}>View Item</Text>
          <Ionicons name="arrow-forward" size={13} color="#059669" />
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingDots}>
          <View style={[styles.loadingDot, { opacity: 1 }]} />
          <View style={[styles.loadingDot, { opacity: 0.6 }]} />
          <View style={[styles.loadingDot, { opacity: 0.3 }]} />
        </View>
        <Text style={styles.loadingText}>Loading alerts…</Text>
      </View>
    );
  }

  const totalCount = matches.length + scans.length + scanEvents.length;

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
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerEyebrow}>ACTIVITY</Text>
              <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 26 : 22 }]}>
                Alerts
              </Text>
              <Text style={styles.headerSub}>
                {totalCount > 0
                  ? `${scanEvents.length} found · ${matches.length} match${matches.length !== 1 ? 'es' : ''} · ${scans.length} scan${scans.length !== 1 ? 's' : ''}`
                  : 'No activity yet'}
              </Text>
            </View>

            {/* Type summary pills */}
            {totalCount > 0 && (
              <View style={styles.headerPills}>
                {scanEvents.length > 0 && (
                  <View style={[styles.headerPill, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <View style={[styles.headerPillDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.headerPillText, { color: '#10b981' }]}>{scanEvents.length}</Text>
                  </View>
                )}
                {matches.length > 0 && (
                  <View style={[styles.headerPill, { backgroundColor: 'rgba(208,8,3,0.12)' }]}>
                    <Ionicons name="sparkles" size={10} color={colors.ember} />
                    <Text style={[styles.headerPillText, { color: colors.ember }]}>{matches.length}</Text>
                  </View>
                )}
                {scans.length > 0 && (
                  <View style={[styles.headerPill, { backgroundColor: 'rgba(245,200,66,0.15)' }]}>
                    <Ionicons name="qr-code-outline" size={10} color="#B8870A" />
                    <Text style={[styles.headerPillText, { color: '#B8870A' }]}>{scans.length}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerWave} />
      </View>

      {/* ── LIST / EMPTY ────────────────────────────────────── */}
      {totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconOuter}>
            <View style={styles.emptyIconInner}>
              <Ionicons
                name="notifications-outline"
                size={r.isTablet ? 40 : 32}
                color="rgba(69,53,75,0.35)"
              />
            </View>
          </View>
          <Text style={[styles.emptyText, { fontSize: r.isTablet ? 18 : 16 }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptySubtext, { fontSize: r.isTablet ? 14 : 13 }]}>
            When someone scans your QR code or AI finds a match, you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...scanEvents.map(e => ({ ...e, type: 'scan_event' })),
            ...matches.map(m => ({ ...m, type: 'match' })),
            ...scans.map(s => ({ ...s, type: 'scan' })),
          ]}
          renderItem={({ item }) => {
            if (item.type === 'scan_event') return renderScanEvent({ item });
            if (item.type === 'match') return renderMatch({ item });
            return renderScan({ item });
          }}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={r.listColumns}
          key={r.listColumns}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: r.hPad },
            r.maxContentWidth && {
              maxWidth: r.maxContentWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
          columnWrapperStyle={r.listColumns === 2 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchNotifications}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },

  // ── Loading ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    gap: 10,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grape,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(69,53,75,0.45)',
    fontWeight: '500',
  },

  // ── Header ──
  header: {
    backgroundColor: colors.grape,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  headerBlob1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -30,
  },
  headerBlob2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,200,66,0.07)',
    top: 30,
    right: 55,
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
  headerInner: { width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(245,200,66,0.7)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '400',
  },
  headerPills: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // ── List ──
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 2,
  },

  // ── Cards (shared) ──
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cardScan: {
    borderColor: 'rgba(219,179,84,0.25)',
  },
  cardMatch: {
    borderColor: 'rgba(208,8,3,0.15)',
  },
  cardFound: {
    borderColor: 'rgba(16,185,129,0.2)',
  },
  cardGrid: {
    minWidth: 0,
  },

  // Colored top accent bar
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1,
  },
  cardIconWrapScan: {
    backgroundColor: 'rgba(219,179,84,0.12)',
    borderColor: 'rgba(219,179,84,0.2)',
  },
  cardIconWrapMatch: {
    backgroundColor: 'rgba(208,8,3,0.1)',
    borderColor: 'rgba(208,8,3,0.18)',
  },
  cardIconWrapFound: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.18)',
  },
  cardHeaderText: {
    flex: 1,
    gap: 3,
  },
  cardTypeBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B8870A',
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#1A1611',
    lineHeight: 18,
  },
  cardItemName: {
    fontWeight: '800',
    color: '#1A1611',
  },
  cardTimeCol: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  cardTime: {
    fontSize: 10,
    color: '#8A8070',
    fontWeight: '500',
    flexShrink: 0,
  },

  // Match score pill
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: '#F0EBE3',
    marginBottom: 10,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 7,
  },
  detailLabel: {
    fontSize: 9,
    color: '#8A8070',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    width: 52,
    paddingTop: 1,
  },
  detailValue: {
    flex: 1,
    color: '#1A1611',
    lineHeight: 16,
    fontWeight: '400',
  },

  // CTA row
  cardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE3',
  },
  cardCTAText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F5F0E8',
    gap: 10,
  },
  emptyIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(69,53,75,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(69,53,75,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: -0.2,
  },
  emptySubtext: {
    color: '#8A8070',
    textAlign: 'center',
    lineHeight: 20,
  },
});