// Lost Report Helper Functions

import { supabase } from './supabase';

/**
 * Fetch lost report for a specific item
 * @param {string} itemId - Item UUID
 * @returns {Promise<Object|null>} Lost report or null if not found
 */
export async function getLostReportForItem(itemId) {
  try {
    const { data, error } = await supabase
      .from('lost_reports')
      .select('*')
      .eq('item_id', itemId)
      .order('reported_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching lost report:', error);
    return null;
  }
}

/**
 * Fetch all lost reports for current user
 * @param {string} status - Optional status filter ('reported', 'investigating', 'resolved')
 * @returns {Promise<Array>} Array of lost reports with item details
 */
export async function getUserLostReports(status = null) {
  try {
    let query = supabase
      .from('lost_reports')
      .select(`
        *,
        item:items (
          id,
          name,
          category,
          photo_urls,
          status
        )
      `)
      .order('reported_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user lost reports:', error);
    return [];
  }
}

/**
 * Create a new lost report
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createLostReport(reportData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('lost_reports')
      .insert([{
        item_id: reportData.itemId,
        user_id: user.id,
        last_seen_location: reportData.lastSeenLocation,
        last_seen_date: reportData.lastSeenDate,
        circumstances: reportData.circumstances,
        notes: reportData.notes || null,
        status: 'reported',
      }])
      .select()
      .single();

    if (error) throw error;

    // Update item status to 'lost'
    const { error: statusError } = await supabase
      .from('items')
      .update({ status: 'lost' })
      .eq('id', reportData.itemId);

    if (statusError) {
      console.error('Error updating item status:', statusError);
    }

    return data;
  } catch (error) {
    console.error('Error creating lost report:', error);
    throw error;
  }
}

/**
 * Update an existing lost report
 * @param {string} reportId - Report UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateLostReport(reportId, updates) {
  try {
    const { data, error } = await supabase
      .from('lost_reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating lost report:', error);
    throw error;
  }
}

/**
 * Mark lost report as resolved
 * @param {string} reportId - Report UUID
 * @returns {Promise<Object>} Updated report
 */
export async function resolveLostReport(reportId) {
  try {
    const { data, error } = await supabase
      .from('lost_reports')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error resolving lost report:', error);
    throw error;
  }
}

/**
 * Delete a lost report (only if status is 'reported')
 * @param {string} reportId - Report UUID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteLostReport(reportId) {
  try {
    const { error } = await supabase
      .from('lost_reports')
      .delete()
      .eq('id', reportId)
      .eq('status', 'reported'); // Only allow deletion of 'reported' status

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting lost report:', error);
    throw error;
  }
}

/**
 * Get all lost reports (admin only)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of lost reports
 */
export async function getAllLostReports(filters = {}) {
  try {
    let query = supabase
      .from('lost_reports')
      .select(`
        *,
        item:items (
          id,
          name,
          category,
          photo_urls,
          status,
          metadata
        ),
        user:profiles!user_id (
          id,
          full_name,
          student_id
        )
      `)
      .order('reported_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('reported_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('reported_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all lost reports:', error);
    return [];
  }
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatReportDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Get status badge color
 * @param {string} status - Report status
 * @returns {Object} Color object with background and text colors
 */
export function getStatusColor(status) {
  const colors = {
    reported: {
      bg: 'rgba(245, 158, 11, 0.1)',
      text: '#d97706',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    investigating: {
      bg: 'rgba(59, 130, 246, 0.1)',
      text: '#2563eb',
      border: 'rgba(59, 130, 246, 0.3)',
    },
    resolved: {
      bg: 'rgba(34, 197, 94, 0.1)',
      text: '#16a34a',
      border: 'rgba(34, 197, 94, 0.3)',
    },
  };

  return colors[status] || colors.reported;
}
