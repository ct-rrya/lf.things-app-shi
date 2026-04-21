import { supabase } from './supabase';
import { createNotification } from './notificationService';

/**
 * Send Chat Message
 */
export async function sendMessage({
  itemId,
  fromUserId,
  toUserId,
  message,
}) {
  try {
    // Validate inputs
    if (!itemId || !fromUserId || !toUserId || !message.trim()) {
      return {
        success: false,
        error: 'All fields are required',
      };
    }

    // Insert message
    const { data: chatMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        item_id: itemId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: 'Failed to send message',
      };
    }

    // Get item details for notification
    const { data: item } = await supabase
      .from('items')
      .select('name')
      .eq('id', itemId)
      .single();

    // Create notification for recipient
    await createNotification({
      userId: toUserId,
      type: 'message',
      title: 'New Message',
      body: `You have a new message about ${item?.name || 'your item'}`,
      data: {
        item_id: itemId,
        message_id: chatMessage.id,
        from_user_id: fromUserId,
      },
    });

    return {
      success: true,
      message: chatMessage,
    };
  } catch (error) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get Chat Messages for Item
 */
export async function getChatMessages(itemId, userId) {
  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        from_user:users!chat_messages_from_user_id_fkey(id, student_id, email),
        to_user:users!chat_messages_to_user_id_fkey(id, student_id, email)
      `)
      .eq('item_id', itemId)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get chat messages error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messages };
  } catch (error) {
    console.error('Get chat messages error:', error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

/**
 * Get Chat Threads for User
 * Returns list of items with active chats
 */
export async function getChatThreads(userId) {
  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        item_id,
        created_at,
        is_read,
        item:items(id, name, category, photo_urls, user_id),
        from_user:users!chat_messages_from_user_id_fkey(id, student_id),
        to_user:users!chat_messages_to_user_id_fkey(id, student_id)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get chat threads error:', error);
      return { success: false, error: error.message };
    }

    // Group messages by item_id and get latest message per thread
    const threadsMap = new Map();

    messages?.forEach(msg => {
      if (!threadsMap.has(msg.item_id)) {
        // Determine the other user in the conversation
        const otherUser = msg.from_user.id === userId ? msg.to_user : msg.from_user;
        
        threadsMap.set(msg.item_id, {
          item_id: msg.item_id,
          item: msg.item,
          other_user: otherUser,
          last_message_at: msg.created_at,
          has_unread: !msg.is_read && msg.to_user.id === userId,
        });
      }
    });

    const threads = Array.from(threadsMap.values());

    return { success: true, threads };
  } catch (error) {
    console.error('Get chat threads error:', error);
    return { success: false, error: 'Failed to fetch chat threads' };
  }
}

/**
 * Mark Messages as Read
 */
export async function markMessagesAsRead(itemId, userId) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('item_id', itemId)
      .eq('to_user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return { success: false, error: 'Failed to mark messages as read' };
  }
}

/**
 * Get Unread Message Count
 */
export async function getUnreadMessageCount(userId) {
  try {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Get unread message count error:', error);
    return { success: false, error: 'Failed to get unread count' };
  }
}

/**
 * Subscribe to Real-time Chat Messages
 */
export function subscribeToChatMessages(itemId, userId, callback) {
  const channel = supabase
    .channel(`chat:${itemId}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `item_id=eq.${itemId}`,
      },
      (payload) => {
        // Only trigger callback if message involves this user
        if (
          payload.new.from_user_id === userId ||
          payload.new.to_user_id === userId
        ) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Delete Chat Message
 */
export async function deleteMessage(messageId, userId) {
  try {
    // Only allow deletion of own messages
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('from_user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete message error:', error);
    return { success: false, error: 'Failed to delete message' };
  }
}

/**
 * Start Chat with Item Owner
 * Creates initial scan event and returns chat info
 */
export async function startChatWithOwner(itemId, scannerUserId) {
  try {
    // Get item and owner details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, name, user_id')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return {
        success: false,
        error: 'Item not found',
      };
    }

    // Check if scanner is not the owner
    if (item.user_id === scannerUserId) {
      return {
        success: false,
        error: 'You cannot chat with yourself',
      };
    }

    // Record scan event with chat action
    const { error: scanError } = await supabase
      .from('scan_events')
      .insert({
        item_id: itemId,
        scanner_user_id: scannerUserId,
        scanner_type: 'app',
        action_taken: 'chatted',
      });

    if (scanError) {
      console.error('Record scan error:', scanError);
    }

    return {
      success: true,
      item,
      ownerId: item.user_id,
    };
  } catch (error) {
    console.error('Start chat error:', error);
    return {
      success: false,
      error: 'Failed to start chat',
    };
  }
}
