// View and manage user's registered items

/*
Functions:
    •	fetchItems(): Gets user's items filtered by status
    •	updateItemStatus(): Changes item status
    •	deleteItem(): Removes item from database
    •	Real-time updates when items change
*/


import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  Platform, useWindowDimensions, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { colors } from '../../styles/colors';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 14;
  const maxContentWidth = isWeb && width > 900 ? 860 : undefined;
  const headerTopPad = isWeb ? 16
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 52;
  const fontScale = isTablet ? 1.1 : 1;
  const feedColumns = isTablet ? 2 : 1;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale, feedColumns };
}

export default function MyItems() {
  const [activeTab, setActiveTab] = useState('My Items');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const r = useResponsive();

  const TABS = ['My Items', 'My Credits'];

  useEffect(() => {
    if (activeTab === 'My Items') {
      fetchItems();
    }
  }, [activeTab]);

  async function fetchItems() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      Alert.alert(
        'Unable to Load Items',
        'There was a problem loading your items. Please check your connection and try again.',
        [{ text: 'Retry', onPress: () => fetchItems() }, { text: 'Cancel', style: 'cancel' }]
      );
    } finally {
      setLoading(false);
    }
  }

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

  function getStatusConfig(status) {
    switch (status) {
      case 'lost':
        return {
          label: 'Lost',
          color: colors.ember,
          bgColor: 'rgba(208,8,3,0.08)',
          borderColor: 'rgba(208,8,3,0.18)',
          dotColor: colors.ember,
        };
      case 'located':
        return {
          label: 'Located',
          color: '#d97706',
          bgColor: 'rgba(245,158,11,0.08)',
          borderColor: 'rgba(245,158,11,0.2)',
          dotColor: '#f59e0b',
        };
      case 'recovered':
        return {
          label: 'Recovered',
          color: '#059669',
          bgColor: 'rgba(16,185,129,0.08)',
          borderColor: 'rgba(16,185,129,0.18)',
          dotColor: '#10b981',
        };
      default: // safe
        return {
          label: 'Safe',
          color: '#6b7280',
          bgColor: 'rgba(107,114,128,0.08)',
          borderColor: 'rgba(107,114,128,0.18)',
          dotColor: '#9ca3af',
        };
    }
  }

  // Group items by status
  const groupedItems = {
    lost: items.filter(i => i.status === 'lost'),
    located: items.filter(i => i.status === 'located'),
    recovered: items.filter(i => i.status === 'recovered'),
    safe: items.filter(i => !i.status || i.status === 'safe'),
  };

  function renderItem({ item, index }) {
    const { icon, color } = getCategoryIcon(item.category);
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          r.feedColumns === 2 && styles.itemCardGrid,
        ]}
        onPress={() => router.push(`/item/${item.id}`)}
        activeOpacity={0.75}
      >
        {/* Left color accent */}
        <View style={[styles.itemCardAccent, { backgroundColor: color }]} />

        {/* Photo or Icon */}
        <View style={[styles.itemPhoto, { backgroundColor: `${color}15` }]}>
          {item.photo_urls?.[0] ? (
            <Image source={{ uri: item.photo_urls[0] }} style={styles.itemPhotoImage} />
          ) : (
            <Ionicons name={icon} size={r.isTablet ? 26 : 22} color={color} />
          )}
        </View>

        {/* Item Info */}
        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { fontSize: 14 * r.fontScale }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.itemCategory, { fontSize: 12 * r.fontScale }]} numberOfLines={1}>
            {item.category || 'Uncategorized'}
          </Text>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: statusConfig.bgColor,
              borderColor: statusConfig.borderColor,
            },
          ]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="rgba(69,53,75,0.2)" />
      </TouchableOpacity>
    );
  }

  function renderSection(title, sectionItems, icon, iconColor) {
    if (sectionItems.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <Text style={[styles.sectionTitle, { fontSize: r.isTablet ? 14 : 13 }]}>
            {title}
          </Text>
          <View style={[styles.sectionCount, { backgroundColor: `${iconColor}15` }]}>
            <Text style={[styles.sectionCountText, { color: iconColor }]}>
              {sectionItems.length}
            </Text>
          </View>
        </View>
        <FlatList
          data={sectionItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={r.feedColumns}
          key={r.feedColumns}
          scrollEnabled={false}
          columnWrapperStyle={r.feedColumns === 2 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.sectionList}
        />
      </View>
    );
  }

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
              <Text style={styles.headerEyebrow}>INVENTORY</Text>
              <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 26 : 22 }]}>
                My Items
              </Text>
              <Text style={styles.headerSub}>
                {items.length > 0
                  ? `${items.length} item${items.length !== 1 ? 's' : ''} registered`
                  : 'No items yet'}
              </Text>
            </View>

            {/* Mini stats cluster */}
            {items.length > 0 && (
              <View style={styles.headerStats}>
                {groupedItems.lost.length > 0 && (
                  <View style={styles.headerStatPill}>
                    <View style={[styles.headerStatDot, { backgroundColor: colors.ember }]} />
                    <Text style={styles.headerStatText}>{groupedItems.lost.length}</Text>
                  </View>
                )}
                {groupedItems.located.length > 0 && (
                  <View style={styles.headerStatPill}>
                    <View style={[styles.headerStatDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.headerStatText}>{groupedItems.located.length}</Text>
                  </View>
                )}
                {groupedItems.recovered.length > 0 && (
                  <View style={styles.headerStatPill}>
                    <View style={[styles.headerStatDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.headerStatText}>{groupedItems.recovered.length}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Wave bottom */}
        <View style={styles.headerWave} />
      </View>

      {/* ── SUB TABS ───────────────────────────────────────── */}
      <View style={[
        styles.tabRowWrap,
        r.maxContentWidth && { alignItems: 'center' },
      ]}>
        <View style={[
          styles.tabRow,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, width: '100%' },
        ]}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            const isCredits = tab === 'My Credits';
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isCredits ? 'trophy-outline' : 'cube-outline'}
                  size={14}
                  color={isActive ? colors.grape : 'rgba(69,53,75,0.35)'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                  { fontSize: r.isTablet ? 13 : 12 },
                ]}>
                  {tab}
                </Text>
                {isCredits && (
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                )}
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── CONTENT ────────────────────────────────────────── */}
      {activeTab === 'My Items' ? (
        loading ? (
          <View style={styles.centerContainer}>
            <View style={styles.loadingDots}>
              <View style={[styles.loadingDot, { opacity: 1 }]} />
              <View style={[styles.loadingDot, { opacity: 0.6 }]} />
              <View style={[styles.loadingDot, { opacity: 0.3 }]} />
            </View>
            <Text style={styles.loadingText}>Loading items…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <Ionicons name="cube-outline" size={r.isTablet ? 40 : 32} color="rgba(69,53,75,0.35)" />
              </View>
            </View>
            <Text style={[styles.emptyText, { fontSize: r.isTablet ? 18 : 16 }]}>
              No items yet
            </Text>
            <Text style={[styles.emptySubtext, { fontSize: r.isTablet ? 14 : 13 }]}>
              Register your valuables to track and protect them
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/register')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Register Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[1]}
            renderItem={() => (
              <View style={[
                styles.content,
                { paddingHorizontal: r.hPad },
                r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
              ]}>
                {renderSection('Lost', groupedItems.lost, 'alert-circle', colors.ember)}
                {renderSection('Located', groupedItems.located, 'location', '#f59e0b')}
                {renderSection('Recovered', groupedItems.recovered, 'checkmark-circle', '#10b981')}
                {renderSection('Safe', groupedItems.safe, 'shield-checkmark', '#6b7280')}
              </View>
            )}
            keyExtractor={() => 'sections'}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchItems}
          />
        )
      ) : (
        // ── My Credits Tab ──────────────────────────────────
        <View style={styles.creditsContainer}>
          <View style={styles.creditsCard}>
            {/* Top glow */}
            <View style={styles.creditsGlow} />

            <View style={styles.creditsIconWrap}>
              <Ionicons name="trophy" size={r.isTablet ? 48 : 40} color={colors.gold} />
            </View>

            <Text style={[styles.creditsTitle, { fontSize: r.isTablet ? 22 : 20 }]}>
              My Credits
            </Text>

            {/* Divider */}
            <View style={styles.creditsDivider} />

            <View style={styles.creditsStars}>
              {[0, 1, 2].map(i => (
                <Ionicons
                  key={i}
                  name="star"
                  size={i === 1 ? 28 : 20}
                  color={i === 1 ? colors.gold : 'rgba(219,179,84,0.4)'}
                />
              ))}
            </View>

            <Text style={[styles.creditsText, { fontSize: r.isTablet ? 15 : 14 }]}>
              Earn credits every time you help return a lost item to its rightful owner.
            </Text>

            <View style={styles.comingSoonBadge}>
              <Ionicons name="time-outline" size={13} color={colors.grape} />
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── REGISTER FAB ───────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/register')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },

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

  // mini status pills in header
  headerStats: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  headerStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Sub Tabs ──
  tabRowWrap: {
    backgroundColor: '#F5F0E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    position: 'relative',
    gap: 2,
  },
  tabActive: {
    // slight background tint on active
  },
  tabText: {
    fontWeight: '600',
    color: 'rgba(69,53,75,0.35)',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: colors.grape,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2.5,
    backgroundColor: colors.grape,
    borderRadius: 2,
  },
  comingSoonPill: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 3,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8a6a10',
    letterSpacing: 0.2,
  },

  // ── Content ──
  content: {
    paddingTop: 18,
    paddingBottom: 32,
  },

  // ── Section ──
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: -0.1,
    flex: 1,
  },
  sectionCount: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionList: {
    gap: 10,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 2,
  },

  // ── Item Card ──
  itemCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  itemCardGrid: {
    minWidth: 0,
  },
  // thin left color accent bar
  itemCardAccent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    opacity: 0.5,
  },
  itemPhoto: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  itemPhotoImage: {
    width: '100%',
    height: '100%',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  itemName: {
    fontWeight: '700',
    color: '#1A1611',
    letterSpacing: -0.1,
  },
  itemCategory: {
    color: '#8A8070',
    fontWeight: '400',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 10,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1611',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // ── Credits Tab ──
  creditsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F5F0E8',
  },
  creditsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    maxWidth: 380,
    width: '100%',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  creditsGlow: {
    position: 'absolute',
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  creditsIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(219,179,84,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(219,179,84,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  creditsTitle: {
    fontWeight: '900',
    color: '#1A1611',
    letterSpacing: -0.3,
  },
  creditsDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(245,200,66,0.4)',
    marginVertical: 2,
  },
  creditsStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditsText: {
    color: '#8A8070',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(69,53,75,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.1)',
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grape,
    letterSpacing: 0.3,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1611',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});