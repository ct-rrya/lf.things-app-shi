import { supabase } from './supabase';
import { createNotification } from './notificationService';
import { getItemByQRCode } from './itemService';

/**
 * Record Scan Event
 * Tracks QR code scans and notifies owner
 */
export async function recordScanEvent({
  itemId,
  scannerUserId = null,
  scannerType = 'web',
  scannerIp = null,
  location = null,
  actionTaken = 'viewed',
}) {
  try {
    // Insert scan event (trigger will auto-increment scan_count)
    const { data: scanEvent, error } = await supabase
      .from('scan_events')
      .insert({
        item_id: itemId,
        scanner_user_id: scannerUserId,
        scanner_type: scannerType,
        scanner_ip: scannerIp,
        location,
        action_taken: actionTaken,
      })
      .select()
      .single();

    if (error) {
      console.error('Record scan event error:', error);
      return {
        success: false,
        error: 'Failed to record scan event',
      };
    }

    // Get item details to notify owner
    const { data: item } = await supabase
      .from('items')
      .select('user_id, name, status')
      .eq('id', itemId)
      .single();

    if (item && item.user_id) {
      // Create notification for owner
      let notificationTitle = 'Your Item Was Scanned';
      let notificationBody = `Someone scanned the QR code for your ${item.name}.`;

      if (actionTaken === 'returned_to_ssg') {
        notificationTitle = 'Item Returned to SSG Office';
        notificationBody = `Your ${item.name} has been returned to the SSG office. Please claim it during office hours.`;
      } else if (actionTaken === 'chatted') {
        notificationTitle = 'New Message About Your Item';
        notificationBody = `Someone wants to chat about your ${item.name}.`;
      } else if (actionTaken === 'reported_found') {
        notificationTitle = 'Your Item Was Found!';
        notificationBody = `Someone found your ${item.name}. Check your messages for details.`;
      }

      await createNotification({
        userId: item.user_id,
        type: 'item_scanned',
        title: notificationTitle,
        body: notificationBody,
        data: {
          item_id: itemId,
          scan_event_id: scanEvent.id,
          action_taken: actionTaken,
        },
      });
    }

    return {
      success: true,
      scanEvent,
    };
  } catch (error) {
    console.error('Record scan event error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Handle QR Scan (App - Logged In User)
 * Returns item details and available actions
 */
export async function handleAppScan(qrCode, scannerUserId) {
  try {
    // Get item by QR code
    const itemResult = await getItemByQRCode(qrCode);

    if (!itemResult.success) {
      return {
        success: false,
        error: 'Item not found',
      };
    }

    const item = itemResult.item;

    // Check if scanner is the owner
    const isOwner = item.user_id === scannerUserId;

    // Record scan event
    await recordScanEvent({
      itemId: item.id,
      scannerUserId,
      scannerType: 'app',
      actionTaken: 'viewed',
    });

    // Return item details with available actions
    return {
      success: true,
      item,
      isOwner,
      availableActions: isOwner
        ? ['view_details', 'edit_item']
        : ['return_to_ssg', 'chat_with_owner', 'report_found'],
    };
  } catch (error) {
    console.error('Handle app scan error:', error);
    return {
      success: false,
      error: 'Failed to process scan',
    };
  }
}

/**
 * Handle QR Scan (Web - Not Logged In)
 * Returns basic item info and notifies owner
 */
export async function handleWebScan(qrCode, scannerIp = null) {
  try {
    // Get item by QR code
    const itemResult = await getItemByQRCode(qrCode);

    if (!itemResult.success) {
      return {
        success: false,
        error: 'Item not found',
      };
    }

    const item = itemResult.item;

    // Record scan event
    await recordScanEvent({
      itemId: item.id,
      scannerUserId: null,
      scannerType: 'web',
      scannerIp,
      actionTaken: 'viewed',
    });

    // Return limited item info (no owner contact details)
    return {
      success: true,
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        photo_urls: item.photo_urls,
        status: item.status,
      },
      message: 'This item has been reported. The owner has been notified that you scanned their QR code.',
    };
  } catch (error) {
    console.error('Handle web scan error:', error);
    return {
      success: false,
      error: 'Failed to process scan',
    };
  }
}

/**
 * Report Item Returned to SSG
 */
export async function reportReturnedToSSG(itemId, scannerUserId) {
  try {
    // Record scan event with action
    await recordScanEvent({
      itemId,
      scannerUserId,
      scannerType: 'app',
      actionTaken: 'returned_to_ssg',
    });

    // Update item status
    const { error } = await supabase
      .from('items')
      .update({ status: 'found' })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Item marked as returned to SSG office. Owner has been notified.',
    };
  } catch (error) {
    console.error('Report returned to SSG error:', error);
    return {
      success: false,
      error: 'Failed to report item',
    };
  }
}

/**
 * Report Item Found
 */
export async function reportItemFound(itemId, scannerUserId, location = null) {
  try {
    // Record scan event
    await recordScanEvent({
      itemId,
      scannerUserId,
      scannerType: 'app',
      location,
      actionTaken: 'reported_found',
    });

    // Update item status
    const { error } = await supabase
      .from('items')
      .update({ status: 'found' })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Item marked as found. Owner has been notified.',
    };
  } catch (error) {
    console.error('Report item found error:', error);
    return {
      success: false,
      error: 'Failed to report item',
    };
  }
}

/**
 * Get Scan History for Item
 */
export async function getItemScanHistory(itemId) {
  try {
    const { data: scans, error } = await supabase
      .from('scan_events')
      .select(`
        *,
        scanner:users(id, student_id, email)
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, scans };
  } catch (error) {
    console.error('Get scan history error:', error);
    return { success: false, error: 'Failed to fetch scan history' };
  }
}

/**
 * Get Scan Statistics
 */
export async function getScanStats(userId = null) {
  try {
    let query = supabase
      .from('scan_events')
      .select('action_taken, scanner_type', { count: 'exact' });

    if (userId) {
      // Get scans for user's items
      const { data: userItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', userId);

      const itemIds = userItems?.map(item => item.id) || [];
      query = query.in('item_id', itemIds);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Count by action and scanner type
    const stats = {
      total: count || 0,
      by_action: {},
      by_scanner_type: { app: 0, web: 0 },
    };

    data?.forEach(scan => {
      // Count by action
      if (scan.action_taken) {
        stats.by_action[scan.action_taken] = (stats.by_action[scan.action_taken] || 0) + 1;
      }
      // Count by scanner type
      if (scan.scanner_type) {
        stats.by_scanner_type[scan.scanner_type]++;
      }
    });

    return { success: true, stats };
  } catch (error) {
    console.error('Get scan stats error:', error);
    return { success: false, error: 'Failed to fetch statistics' };
  }
}
