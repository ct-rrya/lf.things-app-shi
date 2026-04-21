// Individual chat conversation

/*
Functions:
    •	fetchMessages(): Gets chat history
    •	sendMessage(): Sends new message
    •	Real-time subscription to new messages
    •	markAsRead(): Updates read status
*/

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform, useWindowDimensions, StatusBar,
  KeyboardAvoidingView, Alert, Image,
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

export default function ChatThread() {
  const { thread_id } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadInfo, setThreadInfo] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const flatListRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchThreadInfo();
    fetchMessages();
    markMessagesAsRead();

    // Poll every 3 seconds as reliable fallback for real-time
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 3000);

    const channel = supabase
      .channel(`thread_${thread_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${thread_id}`,
        },
        (payload) => {
          const incoming = payload.new;
          if (incoming.sender_id !== currentUserIdRef.current) {
            setMessages((prev) => {
              if (prev.some(m => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
            scrollToBottom();
            markMessagesAsRead();
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [thread_id]);

  async function fetchThreadInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user.id);
      currentUserIdRef.current = user.id;

      const { data, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          item:items(id, name, category, photo_urls)
        `)
        .eq('id', thread_id)
        .single();

      if (error) throw error;
      setThreadInfo(data);
      setIsOwner(data.owner_id === user.id);
    } catch (err) {
      console.error('Error fetching thread info:', err);
      Alert.alert('Error', 'Unable to load chat information');
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Merge: keep optimistic temp messages, add real ones without duplicates
      setMessages((prev) => {
        const tempMessages = prev.filter(m => m.id?.startsWith('temp-'));
        const realMessages = data || [];
        // Remove temps that now have a real counterpart (same message text + sender within 10s)
        const filteredTemps = tempMessages.filter(temp =>
          !realMessages.some(real =>
            real.sender_id === temp.sender_id &&
            real.message === temp.message &&
            Math.abs(new Date(real.created_at) - new Date(temp.created_at)) < 10000
          )
        );
        return [...realMessages, ...filteredTemps].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
      });
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markMessagesAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_id', thread_id)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      // Non-critical, ignore
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || threadInfo?.status === 'closed') return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistically add message to UI immediately
    const tempMessage = {
      id: `temp-${Date.now()}`,
      thread_id,
      sender_id: currentUserId,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id,
          sender_id: currentUserId,
          message: messageText,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages((prev) => prev.map(m => m.id === tempMessage.id ? data : m));
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove temp message on failure
      setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }

  async function handleMarkAsRecovered() {
    if (!isOwner) return;

    Alert.alert(
      'Mark as Returned?',
      'This will close the chat and mark the item as safe. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              const now = new Date().toISOString();

              // Update item status
              const { error: itemError } = await supabase
                .from('items')
                .update({ status: 'safe' })
                .eq('id', threadInfo.registered_item_id);

              if (itemError) throw new Error(`Failed to update item: ${itemError.message}`);

              // Update match status
              const { error: matchError } = await supabase
                .from('ai_matches')
                .update({ status: 'recovered', recovered_at: now })
                .eq('id', threadInfo.match_id);

              if (matchError) throw new Error(`Failed to update match: ${matchError.message}`);

              // Get and update found item
              const { data: matchData, error: matchDataError } = await supabase
                .from('ai_matches')
                .select('found_item_id')
                .eq('id', threadInfo.match_id)
                .single();

              if (matchDataError) throw new Error(`Failed to fetch match data: ${matchDataError.message}`);

              if (matchData?.found_item_id) {
                const { error: foundError } = await supabase
                  .from('found_items')
                  .update({ status: 'claimed' })
                  .eq('id', matchData.found_item_id);

                if (foundError) throw new Error(`Failed to update found item: ${foundError.message}`);
              }

              // Close chat thread
              const { error: threadError } = await supabase
                .from('chat_threads')
                .update({ status: 'closed' })
                .eq('id', thread_id);

              if (threadError) throw new Error(`Failed to close chat: ${threadError.message}`);

              Alert.alert(
                '✅ Item Returned!',
                'The item has been marked as safe. The chat is now closed.',
                [{ text: 'OK', onPress: () => router.push('/(tabs)/home') }]
              );
            } catch (err) {
              console.error('Error marking as recovered:', err);
              Alert.alert(
                'Error',
                err.message || 'Failed to mark item as recovered. Some changes may not have been saved. Please try again or contact support.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }

  function scrollToBottom() {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  function renderMessage({ item }) {
    const isMyMessage = item.sender_id === currentUserId;
    const timeString = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[
        styles.messageRow,
        isMyMessage ? styles.messageRowMine : styles.messageRowTheirs,
      ]}>
        {!isMyMessage && (
          <View style={styles.avatarDot}>
            <Ionicons name="person" size={10} color={colors.grape} />
          </View>
        )}
        <View style={[styles.bubble, isMyMessage ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[
            styles.bubbleText,
            isMyMessage ? styles.bubbleTextMine : styles.bubbleTextTheirs,
            { fontSize: r.isTablet ? 15 : 14 },
          ]}>
            {item.message}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={[
              styles.bubbleTime,
              isMyMessage ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
              { fontSize: r.isTablet ? 10 : 9 },
            ]}>
              {timeString}
            </Text>
            {isMyMessage && (
              <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.45)" />
            )}
          </View>
        </View>
      </View>
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
        <Text style={styles.loadingText}>Loading chat…</Text>
      </View>
    );
  }

  const isClosed = threadInfo?.status === 'closed';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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

          <View style={styles.headerAvatar}>
            <Ionicons name="person" size={15} color={colors.grape} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>DIRECT MESSAGE</Text>
            <Text style={[styles.headerTitle, { fontSize: r.isTablet ? 17 : 15 }]}>
              {isOwner ? 'Chat with Finder' : 'Chat with Owner'}
            </Text>
            <Text style={[styles.headerSub, { fontSize: r.isTablet ? 11 : 10 }]} numberOfLines={1}>
              Re: {threadInfo?.item?.name}
            </Text>
          </View>

          {isClosed && (
            <View style={styles.closedPill}>
              <Ionicons name="checkmark-circle" size={11} color="#10b981" />
              <Text style={styles.closedPillText}>Closed</Text>
            </View>
          )}

          {!isClosed && threadInfo?.match_score && (
            <View style={styles.scoreBadge}>
              <Ionicons name="sparkles" size={11} color={colors.gold} />
              <Text style={styles.scoreBadgeText}>
                {Math.round(threadInfo.match_score * 100)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerWave} />
      </View>

      {/* ── ITEM SUMMARY CARD ──────────────────────────────── */}
      {threadInfo?.item && (
        <View style={[
          styles.summaryCard,
          { marginHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%', marginHorizontal: 0 },
        ]}>
          {threadInfo.item.photo_urls?.[0] ? (
            <Image
              source={{ uri: threadInfo.item.photo_urls[0] }}
              style={styles.summaryPhoto}
            />
          ) : (
            <View style={styles.summaryPhotoPlaceholder}>
              <Ionicons name="image-outline" size={22} color="#8A8070" />
            </View>
          )}
          <View style={styles.summaryBody}>
            <Text style={[styles.summaryTitle, { fontSize: r.isTablet ? 14 : 13 }]}>
              {threadInfo.item.name}
            </Text>
            <Text style={[styles.summaryCat, { fontSize: r.isTablet ? 12 : 11 }]}>
              {threadInfo.item.category}
            </Text>
          </View>
          {isClosed && (
            <View style={styles.summaryRecoveredTag}>
            <Text style={styles.summaryRecoveredTagText}>✅ Returned</Text>
            </View>
          )}
        </View>
      )}

      {/* ── CLOSED BANNER ──────────────────────────────────── */}
      {isClosed && (
        <View style={[
          styles.closedBanner,
          { marginHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%', marginHorizontal: 0 },
        ]}>
          <View style={styles.closedBannerIcon}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          </View>
          <Text style={[styles.closedBannerText, { fontSize: r.isTablet ? 13 : 12 }]}>
            Item has been returned. This conversation is now closed.
          </Text>
        </View>
      )}

      {/* ── MESSAGES ───────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <Ionicons name="chatbubbles-outline" size={r.isTablet ? 34 : 26} color="rgba(69,53,75,0.3)" />
              </View>
            </View>
            <Text style={[styles.emptyText, { fontSize: r.isTablet ? 15 : 14 }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { fontSize: r.isTablet ? 13 : 12 }]}>
              Start the conversation to arrange pickup
            </Text>
          </View>
        }
      />

      {/* ── MARK AS RECOVERED ──────────────────────────────── */}
      {isOwner && !isClosed && (
        <View style={[
          styles.recoveredWrap,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <TouchableOpacity
            style={styles.recoveredButton}
            onPress={handleMarkAsRecovered}
            activeOpacity={0.85}
          >
            <View style={styles.recoveredButtonIcon}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
            <Text style={[styles.recoveredButtonText, { fontSize: r.isTablet ? 14 : 13 }]}>
              Mark as Returned
            </Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── INPUT BAR ──────────────────────────────────────── */}
      {!isClosed && (
        <View style={styles.inputBar}>
          <View style={[
            styles.inputBarInner,
            { paddingHorizontal: r.hPad },
            r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
          ]}>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { fontSize: r.isTablet ? 15 : 14 }]}
                placeholder="Type a message…"
                placeholderTextColor="#B8AFA4"
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="send"
                size={r.isTablet ? 18 : 16}
                color={newMessage.trim() ? '#FFFFFF' : '#B8AFA4'}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
    gap: 10,
  },
  loadingDots: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grape },
  loadingText: { fontSize: 13, color: '#8A8070', fontWeight: '500' },

  // ── Header ──
  header: {
    backgroundColor: colors.grape,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -20,
  },
  headerBlob2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,200,66,0.06)',
    top: 20,
    right: 60,
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
    gap: 10,
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 1 },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(245,200,66,0.65)',
    letterSpacing: 2,
  },
  headerTitle: { fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  headerSub: { color: 'rgba(255,255,255,0.45)', marginTop: 1 },

  closedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  closedPillText: { fontSize: 11, fontWeight: '700', color: '#10b981' },

  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  scoreBadgeText: { fontSize: 11, fontWeight: '800', color: colors.gold },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
  },
  summaryPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  summaryBody: { flex: 1, gap: 3 },
  summaryTitle: { fontWeight: '700', color: '#1A1611' },
  summaryCat: { color: '#8A8070', textTransform: 'capitalize' },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  summaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#8a6a10' },
  summaryRecoveredTag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  summaryRecoveredTagText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  // ── Closed Banner ──
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  closedBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  closedBannerText: { flex: 1, color: '#059669', fontWeight: '600', lineHeight: 18 },

  // ── Messages ──
  messagesList: { paddingVertical: 18, gap: 6 },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginBottom: 4,
  },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowTheirs: { justifyContent: 'flex-start' },

  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(69,53,75,0.07)',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },

  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: '#1A1611',
    borderBottomRightRadius: 5,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: { lineHeight: 20 },
  bubbleTextMine: { color: '#FFFFFF', fontWeight: '400' },
  bubbleTextTheirs: { color: '#1A1611', fontWeight: '400' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bubbleTime: { fontWeight: '500' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.38)' },
  bubbleTimeTheirs: { color: '#8A8070' },

  // ── Empty State ──
  emptyContainer: { paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(69,53,75,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(69,53,75,0.06)',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontWeight: '700', color: '#1A1611' },
  emptySubtext: { color: '#8A8070', textAlign: 'center', lineHeight: 18 },

  // ── Mark as Recovered ──
  recoveredWrap: { paddingVertical: 8 },
  recoveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1611',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  recoveredButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoveredButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Input Bar ──
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D0',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
  },
  inputBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    width: '100%',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E8E0D0',
    paddingHorizontal: 15,
    paddingVertical: 9,
    maxHeight: 100,
  },
  input: { color: '#1A1611', lineHeight: 20 },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A1611',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E0D0',
    shadowOpacity: 0,
    elevation: 0,
  },
});