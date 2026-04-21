## Fix Chat Threads Query - Foreign Key Issue

## Problem

Error: `Could not find a relationship between 'chat_threads' and 'items' in the schema cache`

Your query uses: `chat_threads_registered_item_id_fkey`  
But the actual column is: `item_id` (not `registered_item_id`)

---

## Solution Steps

### Step 1: Diagnose

Run in Supabase SQL Editor:
```bash
database/diagnose-chat-threads.sql
```

This shows:
- ✅ Does `chat_threads` table exist?
- ✅ What columns does it have?
- ✅ What foreign keys are configured?
- ✅ What are the exact foreign key names?

### Step 2: Fix Foreign Keys

If foreign keys are missing or incorrect, run:
```bash
database/add-chat-foreign-keys.sql
```

This will:
- Drop old/incorrect foreign keys
- Add correct foreign keys with standard names
- Create performance indexes

### Step 3: Update Your Query

Use the CORRECT foreign key name:

```javascript
// ❌ WRONG - uses non-existent column
const { data, error } = await supabase
  .from('chat_threads')
  .select(`
    *,
    item:items!chat_threads_registered_item_id_fkey(*)
  `)
  .or(`owner_id.eq.${userId},finder_id.eq.${userId}`);

// ✅ CORRECT - uses actual column name
const { data, error } = await supabase
  .from('chat_threads')
  .select(`
    *,
    item:items!chat_threads_item_id_fkey(id, name, category, photo_urls, status)
  `)
  .or(`owner_id.eq.${userId},finder_id.eq.${userId}`)
  .order('updated_at', { ascending: false });
```

---

## Complete Updated chat.js Component

Here's a robust chat list component with fallback logic:

```javascript
// app/(tabs)/chat.js

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, useWindowDimensions, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/colors';

export default function Chat() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchThreads();
    
    // Real-time subscription for new messages
    const channel = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchThreads(); // Refresh threads when new message arrives
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchThreads() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setThreads([]);
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Try with foreign key first
      let { data, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          item:items!chat_threads_item_id_fkey(
            id,
            name,
            category,
            photo_urls,
            status
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
            .select('id, name, category, photo_urls, status')
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

      // Fetch unread counts for each thread
      if (data && data.length > 0) {
        const threadIds = data.map(t => t.id);
        
        const { data: unreadCounts } = await supabase
          .from('chat_messages')
          .select('thread_id')
          .in('thread_id', threadIds)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        const unreadMap = {};
        (unreadCounts || []).forEach(msg => {
          unreadMap[msg.thread_id] = (unreadMap[msg.thread_id] || 0) + 1;
        });

        data = data.map(thread => ({
          ...thread,
          unread_count: unreadMap[thread.id] || 0,
        }));
      }

      setThreads(data || []);
    } catch (err) {
      console.error('Error fetching chat threads:', err);
    } finally {
      setLoading(false);
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

  function renderThread({ item: thread }) {
    const isOwner = thread.owner_id === userId;
    const otherRole = isOwner ? 'Finder' : 'Owner';

    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => router.push(`/chat/${thread.id}`)}
        activeOpacity={0.7}
      >
        {/* Item Photo */}
        {thread.item?.photo_urls?.[0] ? (
          <Image
            source={{ uri: thread.item.photo_urls[0] }}
            style={styles.threadPhoto}
          />
        ) : (
          <View style={styles.threadPhotoPlaceholder}>
            <Ionicons name="image-outline" size={24} color="#8A8070" />
          </View>
        )}

        {/* Thread Info */}
        <View style={styles.threadBody}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle} numberOfLines={1}>
              {thread.item?.name || 'Unknown Item'}
            </Text>
            <Text style={styles.threadTime}>
              {formatTime(thread.updated_at)}
            </Text>
          </View>

          <Text style={styles.threadSubtitle}>
            Chat with {otherRole}
          </Text>

          {thread.status === 'resolved' && (
            <View style={styles.resolvedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#10b981" />
              <Text style={styles.resolvedText}>Resolved</Text>
            </View>
          )}
        </View>

        {/* Unread Badge */}
        {thread.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{thread.unread_count}</Text>
          </View>
        )}

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color="#8A8070" />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Thread List */}
      <FlatList
        data={threads}
        renderItem={renderThread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color="#8A8070" />
            </View>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyText}>
              When someone scans your QR code, you'll see their messages here
            </Text>
          </View>
        }
      />
    </View>
  );
}

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
  },
  loadingText: {
    fontSize: 14,
    color: '#8A8070',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1611',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E0D0',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  threadPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
  },
  threadPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D0',
  },
  threadBody: {
    flex: 1,
    gap: 4,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1611',
    flex: 1,
  },
  threadTime: {
    fontSize: 11,
    color: '#8A8070',
    marginLeft: 8,
  },
  threadSubtitle: {
    fontSize: 13,
    color: '#8A8070',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  resolvedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.grape,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(69,53,75,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1611',
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8070',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
```

---

## Summary

1. ✅ Run `database/diagnose-chat-threads.sql` to check current state
2. ✅ Run `database/add-chat-foreign-keys.sql` to fix foreign keys
3. ✅ Update query to use `chat_threads_item_id_fkey` (not `registered_item_id`)
4. ✅ Use the complete chat.js component above with fallback logic

The component includes:
- Real-time message updates
- Unread message counts
- Proper error handling with fallback queries
- Clean UI matching your app design
