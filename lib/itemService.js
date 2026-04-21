import { supabase } from './supabase';

/**
 * Category Definitions with Dynamic Fields
 */
export const ITEM_CATEGORIES = {
  id: {
    label: 'ID/Lanyard',
    icon: '🪪',
    fields: [
      { name: 'id_type', label: 'ID Type', type: 'select', options: ['Student ID', 'Employee ID', 'Government ID', 'Other'], required: true },
      { name: 'issue_date', label: 'Issue Date', type: 'date', required: false },
    ],
  },
  keys: {
    label: 'Keys',
    icon: '🔑',
    fields: [
      { name: 'key_count', label: 'Number of Keys', type: 'number', required: true },
      { name: 'has_keychain', label: 'Has Keychain?', type: 'boolean', required: false },
      { name: 'key_description', label: 'Key Description', type: 'text', required: false },
    ],
  },
  laptop: {
    label: 'Laptop',
    icon: '💻',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'serial_number', label: 'Serial Number', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'has_charger', label: 'Has Charger?', type: 'boolean', required: false },
      { name: 'case_included', label: 'Case Included?', type: 'boolean', required: false },
    ],
  },
  phone: {
    label: 'Phone',
    icon: '📱',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'imei', label: 'IMEI', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'has_case', label: 'Has Case?', type: 'boolean', required: false },
    ],
  },
  bottle: {
    label: 'Bottle',
    icon: '🍶',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'size', label: 'Size', type: 'select', options: ['Small', 'Medium', 'Large'], required: false },
      { name: 'has_stickers', label: 'Has Stickers?', type: 'boolean', required: false },
    ],
  },
  wallet: {
    label: 'Wallet',
    icon: '👛',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'has_cards', label: 'Contains Cards?', type: 'boolean', required: false },
      { name: 'has_id', label: 'Contains ID?', type: 'boolean', required: false },
    ],
  },
  bag: {
    label: 'Bag',
    icon: '🎒',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'bag_type', label: 'Bag Type', type: 'select', options: ['Backpack', 'Tote', 'Messenger', 'Duffel', 'Other'], required: true },
      { name: 'has_items_inside', label: 'Has Items Inside?', type: 'boolean', required: false },
    ],
  },
  watch: {
    label: 'Watch',
    icon: '⌚',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'watch_type', label: 'Type', type: 'select', options: ['Analog', 'Digital', 'Smart Watch'], required: true },
      { name: 'has_engraving', label: 'Has Engraving?', type: 'boolean', required: false },
    ],
  },
  headphones: {
    label: 'Headphones',
    icon: '🎧',
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'color', label: 'Color', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['Wired', 'Wireless', 'Earbuds'], required: true },
      { name: 'has_case', label: 'Has Case?', type: 'boolean', required: false },
    ],
  },
  other: {
    label: 'Other',
    icon: '📦',
    fields: [
      { name: 'custom_description', label: 'Detailed Description', type: 'textarea', required: true },
    ],
  },
};

/**
 * Generate Unique QR Code
 */
async function generateUniqueQRCode() {
  const { data, error } = await supabase.rpc('generate_qr_code');
  
  if (error) {
    // Fallback: generate client-side
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`.toUpperCase();
  }
  
  return data;
}

/**
 * Register New Item
 */
export async function registerItem({
  userId,
  studentId,
  name,
  category,
  description,
  photoUrls = [],
  metadata = {},
}) {
  try {
    // Validate category
    if (!ITEM_CATEGORIES[category]) {
      return {
        success: false,
        error: 'Invalid category',
      };
    }

    // Generate unique QR code
    const qrCode = await generateUniqueQRCode();

    // Insert item
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        user_id: userId,
        student_id: studentId,
        name,
        category,
        description,
        photo_urls: photoUrls,
        metadata,
        qr_code: qrCode,
        status: 'safe',
      })
      .select()
      .single();

    if (error) {
      console.error('Register item error:', error);
      return {
        success: false,
        error: 'Failed to register item',
      };
    }

    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error('Register item error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get User's Items
 */
export async function getUserItems(userId) {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, items };
  } catch (error) {
    console.error('Get user items error:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}

/**
 * Get Item by ID
 */
export async function getItemById(itemId) {
  try {
    const { data: item, error } = await supabase
      .from('items')
      .select(`
        *,
        user:users(id, student_id, email),
        student:students(first_name, last_name, phone_number)
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, item };
  } catch (error) {
    console.error('Get item error:', error);
    return { success: false, error: 'Failed to fetch item' };
  }
}

/**
 * Get Item by QR Code
 */
export async function getItemByQRCode(qrCode) {
  try {
    const { data: item, error } = await supabase
      .from('items')
      .select(`
        *,
        user:users(id, student_id, email),
        student:students(first_name, last_name, phone_number)
      `)
      .eq('qr_code', qrCode)
      .single();

    if (error) {
      return { success: false, error: 'Item not found' };
    }

    return { success: true, item };
  } catch (error) {
    console.error('Get item by QR error:', error);
    return { success: false, error: 'Failed to fetch item' };
  }
}

/**
 * Update Item
 */
export async function updateItem(itemId, updates) {
  try {
    const { data: item, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, item };
  } catch (error) {
    console.error('Update item error:', error);
    return { success: false, error: 'Failed to update item' };
  }
}

/**
 * Delete Item
 */
export async function deleteItem(itemId) {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete item error:', error);
    return { success: false, error: 'Failed to delete item' };
  }
}

/**
 * Upload Item Photos
 */
export async function uploadItemPhotos(itemId, photos) {
  try {
    const uploadedUrls = [];

    for (let i = 0; i < Math.min(photos.length, 3); i++) {
      const photo = photos[i];
      const fileExt = photo.uri.split('.').pop();
      const fileName = `${itemId}_${i}_${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      // Convert to blob if needed
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(filePath, blob, {
          contentType: photo.type || 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-photos')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return {
      success: true,
      urls: uploadedUrls,
    };
  } catch (error) {
    console.error('Upload photos error:', error);
    return {
      success: false,
      error: 'Failed to upload photos',
    };
  }
}
