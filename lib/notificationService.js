import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

/**
 * Configure Notification Handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Create Notification
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  data = {},
}) {
  try {
    // Insert notification into database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Create notification error:', error);
      return {
        success: false,
        error: 'Failed to create notification',
      };
    }

    // Send push notification if user has push token
    await sendPushNotification(userId, title, body, data);

    return {
      success: true,
      notification,
    };
  } catch (error) {
    console.error('Create notification error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Send Push Notification
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Get user's push token from user metadata or separate table
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) return;

    // TODO: Store push tokens in a separate table or user metadata
    // For now, this is a placeholder for the push notification logic
    
    // Example: Send via Expo Push Notifications
    // const message = {
    //   to: pushToken,
    //   sound: 'default',
    //   title,
    //   body,
    //   data,
    // };
    // await fetch('https://exp.host/--/api/v2/push/send', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(message),
    // });

  } catch (error) {
    console.error('Send push notification error:', error);
  }
}

/**
 * Get User Notifications
 */
export async function getUserNotifications(userId, limit = 50) {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notifications };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark Notification as Read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark All Notifications as Read
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return { success: false, error: 'Failed to mark notifications as read' };
  }
}

/**
 * Delete Notification
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete notification error:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

/**
 * Get Unread Notification Count
 */
export async function getUnreadNotificationCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Get unread count error:', error);
    return { success: false, error: 'Failed to get unread count' };
  }
}

/**
 * Subscribe to Real-time Notifications
 */
export function subscribeToNotifications(userId, callback) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Request Push Notification Permissions
 */
export async function requestPushPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        success: false,
        error: 'Permission not granted for push notifications',
      };
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Request push permissions error:', error);
    return {
      success: false,
      error: 'Failed to get push token',
    };
  }
}

/**
 * Save Push Token to User Profile
 */
export async function savePushToken(userId, pushToken) {
  try {
    // TODO: Create a push_tokens table or add to user metadata
    // For now, this is a placeholder
    
    // Example: Store in user metadata
    // const { error } = await supabase
    //   .from('users')
    //   .update({ push_token: pushToken })
    //   .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Save push token error:', error);
    return { success: false, error: 'Failed to save push token' };
  }
}
