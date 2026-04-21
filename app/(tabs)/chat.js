import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Platform, useWindowDimensions, StatusBar, Alert,
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

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale };
}

export default function ChatInbox() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchThreads();
    subscribeToThreads();
  }, []);

  async function fetchThreads() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user.id);

      // Try with foreign key first
      let { data, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          item:items!chat_threads_item_id_fkey(
            id, name, category, photo_urls
          )
        `)
        .or(`owner_id.eq.${user.id},finder_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      // Fallback if foreign key doesn't work
      if (error && error.message.includes('relationship')) {
        console.warn('Foreign key not found, using fallback query');
        
        const { data: basicThreads, error: fallbackError } = await supabase
          .from('chat_threads')
          .select('*')
          .or(`owner_id.eq.${user.id},finder_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        // Manually fetch item details
        if (basicThreads && basicThreads.length > 0) {
          const itemIds = [...new Set(basicThreads.map(t => t.item_id))];
          
          const { data: items } = await supabase
            .from('items')
            .select('id, name, category, photo_urls')
            .in('id', itemIds);

          const itemsMap = {};
          (items || []).forEach(item => {
            itemsMap[item.id] = item;
          });

          data = basicThreads.map(thread => ({
            ...thread,
            item: itemsMap[thread.item_id] || null,
          }));
        } else {
          data = basicThreads;
        }
      } else if (error) {
        throw error;
      }

      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error('Error fetching threads:', err);
      Alert.alert('Error', 'Unable to load chat threads');
    } finally {
      setLoading(false);
    }
  }

  function subscribeToThreads() {
    const channel = supabase
      .channel('chat_threads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_threads',
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  function renderThread({ item: thread }) {
    const isOwner = thread.owner_id === currentUserId;
    const unreadCount = 0; // TODO: Implement unread count
    const { icon, color } = getCategoryIcon(thread.item?.category);
    const isClosed = thread.status === 'resolved' || thread.status === 'archived';
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[
          styles.threadCard,
          hasUnread && styles.threadCardUnread,
          isClosed && styles.threadCardClosed,
        ]}
        onPress={() => router.push(`/chat/${thread.id}`)}
        activeOpacity={0.75}
      >
        {/* Left unread accent bar */}
        {hasUnread && <View style={styles.unreadBar} />}

        {/* Item Photo/Icon */}
        <View style={[styles.threadPhoto, { backgroundColor: `${color}18` }]}>
          {thread.item?.photo_urls?.[0] ? (
            <Image
              source={{ uri: thread.item.photo_urls[0] }}
              style={styles.threadPhotoImage}
            />
          ) : (
            <Ionicons name={icon} size={r.isTablet ? 26 : 22} color={color} />
          )}
          {!isClosed && <View style={styles.onlineDot} />}
        </View>

        {/* Thread Info */}
        <View style={styles.threadBody}>
          {/* Row 1: title + time */}
          <View style={styles.threadHeader}>
            <Text
              style={[
                styles.threadTitle,
                { fontSize: 14 * r.fontScale },
                isClosed && styles.threadTitleClosed,
                hasUnread && styles.threadTitleUnread,
              ]}
              numberOfLines={1}
            >
              {thread.item?.name || 'Unknown Item'}
            </Text>
            <Text style={styles.threadTime}>
              {formatTime(thread.updated_at || thread.created_at)}
            </Text>
          </View>

          {/* Row 2: role + category */}
          <Text style={styles.threadCategory} numberOfLines={1}>
            {isOwner ? '👤 Chat with Finder' : '🔍 Chat with Owner'}
            {'  ·  '}
            <Text style={[styles.threadCategoryTag, { color }]}>
              {thread.item?.category}
            </Text>
          </Text>

          {/* Row 3: status */}
          <View style={styles.threadFooter}>
            {isClosed ? (
              <View style={[styles.statusBadge, styles.statusBadgeClosed]}>
                <Ionicons name="checkmark-circle" size={11} color="#10b981" />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Resolved</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.statusBadgeOpen]}>
                <View style={styles.statusPulse} />
                <Text style={[styles.statusBadgeText, { color: '#8a6a10' }]}>Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Unread count badge */}
        {hasUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="rgba(69,53,75,0.2)" style={styles.chevron} />
        )}
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
        <Text style={styles.loadingText}>Loading chats…</Text>
      </View>
    );
  }

  const openThreads = threads.filter(t => t.status === 'active');
  const closedThreads = threads.filter(t => t.status === 'resolved' || t.status === 'archived');

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
              <Text style={styles.headerEyebrow}>MESSAGES</Text>
              <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 26 : 22 }]}>
                Chats
              </Text>
              <Text style={styles.headerSub}>
                {threads.length > 0
                  ? `${openThreads.length} active · ${closedThreads.length} resolved`
                  : 'No conversations yet'}
              </Text>
            </View>

            {openThreads.length > 0 && (
              <View style={styles.headerUnreadPill}>
                <Ionicons name="chatbubble" size={13} color={colors.grape} />
                <Text style={styles.headerUnreadText}>{openThreads.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Wave bottom edge */}
        <View style={styles.headerWave} />
      </View>

      {/* ── THREAD LIST ────────────────────────────────────── */}
      {threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconOuter}>
            <View style={styles.emptyIconInner}>
              <Ionicons
                name="chatbubbles-outline"
                size={r.isTablet ? 40 : 32}
                color="rgba(69,53,75,0.35)"
              />
            </View>
          </View>
          <Text style={[styles.emptyText, { fontSize: r.isTablet ? 18 : 16 }]}>
            No chats yet
          </Text>
          <Text style={[styles.emptySubtext, { fontSize: r.isTablet ? 14 : 13 }]}>
            When you confirm a match, a chat thread will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.threadList,
            { paddingHorizontal: r.hPad },
            r.maxContentWidth && {
              maxWidth: r.maxContentWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchThreads}
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,200,66,0.08)',
    top: 30,
    right: 50,
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
  headerUnreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 2,
  },
  headerUnreadText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.grape,
    letterSpacing: 0.3,
  },

  // ── Thread List ──
  threadList: {
    paddingTop: 16,
    paddingBottom: 32,
  },

  threadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  threadCardUnread: {
    borderColor: `${colors.grape}22`,
    backgroundColor: '#FEFCF8',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  threadCardClosed: {
    opacity: 0.6,
    backgroundColor: '#FAFAFA',
  },

  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.grape,
  },

  // ── Photo ──
  threadPhoto: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
    overflow: 'visible',
  },
  threadPhotoImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // ── Body ──
  threadBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  threadTitle: {
    flex: 1,
    fontWeight: '600',
    color: '#1A1611',
    letterSpacing: -0.1,
  },
  threadTitleUnread: {
    fontWeight: '800',
    color: colors.grape,
  },
  threadTitleClosed: {
    color: 'rgba(69,53,75,0.45)',
    fontWeight: '500',
  },
  threadTime: {
    fontSize: 11,
    color: '#8A8070',
    fontWeight: '500',
    flexShrink: 0,
  },

  threadCategory: {
    fontSize: 12,
    color: '#8A8070',
  },
  threadCategoryTag: {
    fontWeight: '600',
  },

  threadMessage: {
    fontSize: 13,
    color: '#8A8070',
    lineHeight: 17,
  },
  threadMessageUnread: {
    color: '#1A1611',
    fontWeight: '600',
  },
  threadMessageEmpty: {
    fontSize: 13,
    color: 'rgba(138,128,112,0.5)',
    fontStyle: 'italic',
  },

  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeClosed: {
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  statusBadgeOpen: {
    backgroundColor: 'rgba(219,179,84,0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },

  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(219,179,84,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(219,179,84,0.2)',
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8a6a10',
  },

  unreadBadge: {
    backgroundColor: colors.grape,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: colors.grape,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  chevron: {
    flexShrink: 0,
    marginLeft: 2,
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