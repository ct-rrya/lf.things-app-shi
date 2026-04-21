import { supabase } from './supabase';
import { createNotification } from './notificationService';

/**
 * Create Lost Report
 * Changes item status to 'lost' and creates formal report
 */
export async function createLostReport({
  itemId,
  userId,
  lastSeenLocation,
  lastSeenDate,
  circumstances,
  notes = '',
}) {
  try {
    // Validate required fields
    if (!itemId || !userId || !lastSeenLocation || !lastSeenDate || !circumstances) {
      return {
        success: false,
        error: 'All required fields must be filled',
      };
    }

    // Check if item already has an active lost report
    const { data: existingReport } = await supabase
      .from('lost_reports')
      .select('id')
      .eq('item_id', itemId)
      .eq('status', 'reported')
      .maybeSingle(); // Use maybeSingle to avoid errors when no record found

    if (existingReport) {
      return {
        success: false,
        error: 'This item already has an active lost report',
      };
    }

    // Create lost report
    const { data: report, error } = await supabase
      .from('lost_reports')
      .insert({
        item_id: itemId,
        user_id: userId,
        last_seen_location: lastSeenLocation,
        last_seen_date: lastSeenDate,
        circumstances,
        notes: notes || null,
        status: 'reported',
      })
      .select()
      .single();

    if (error) {
      console.error('Create lost report error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create lost report',
      };
    }

    // Update item status to 'lost'
    const { error: itemError } = await supabase
      .from('items')
      .update({ status: 'lost' })
      .eq('id', itemId);

    if (itemError) {
      console.error('Update item status error:', itemError);
      // Don't fail the whole operation, just log the error
    }

    // Create notification for user
    await createNotification({
      userId,
      type: 'system',
      title: 'Lost Report Created',
      body: 'Your lost item report has been submitted. We will notify you if someone scans your QR code.',
      data: { item_id: itemId, report_id: report.id },
    });

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error('Create lost report error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get Lost Reports for User
 */
export async function getUserLostReports(userId) {
  try {
    const { data: reports, error } = await supabase
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
      .eq('user_id', userId)
      .order('reported_at', { ascending: false });

    if (error) {
      console.error('Get user lost reports error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, reports: reports || [] };
  } catch (error) {
    console.error('Get lost reports error:', error);
    return { success: false, error: 'Failed to fetch lost reports' };
  }
}

/**
 * Get Lost Report by ID
 * FIXED: Changed 'users' to 'profiles'
 */
export async function getLostReportById(reportId) {
  try {
    const { data: report, error } = await supabase
      .from('lost_reports')
      .select(`
        *,
        item:items (
          id, 
          name, 
          category, 
          description, 
          photo_urls, 
          status
        ),
        profile:profiles (
          id,
          display_name,
          student_id
        )
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Get lost report by ID error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, report };
  } catch (error) {
    console.error('Get lost report error:', error);
    return { success: false, error: 'Failed to fetch lost report' };
  }
}

/**
 * Update Lost Report
 */
export async function updateLostReport(reportId, updates) {
  try {
    const { data: report, error } = await supabase
      .from('lost_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Update lost report error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, report };
  } catch (error) {
    console.error('Update lost report error:', error);
    return { success: false, error: 'Failed to update lost report' };
  }
}

/**
 * Resolve Lost Report
 * Marks report as resolved and updates item status
 */
export async function resolveLostReport(reportId, itemId, newItemStatus = 'safe') {
  try {
    // Update report status
    const { error: reportError } = await supabase
      .from('lost_reports')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (reportError) {
      console.error('Update report error:', reportError);
      return { success: false, error: reportError.message };
    }

    // Update item status
    const { error: itemError } = await supabase
      .from('items')
      .update({ status: newItemStatus })
      .eq('id', itemId);

    if (itemError) {
      console.error('Update item error:', itemError);
      return { success: false, error: itemError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Resolve lost report error:', error);
    return { success: false, error: 'Failed to resolve lost report' };
  }
}

/**
 * Get All Active Lost Reports (Admin)
 * FIXED: Changed 'users' to 'profiles' and 'students'
 */
export async function getAllActiveLostReports() {
  try {
    const { data: reports, error } = await supabase
      .from('lost_reports')
      .select(`
        *,
        item:items (
          id, 
          name, 
          category, 
          photo_urls, 
          status
        ),
        profile:profiles (
          id,
          display_name,
          student_id
        )
      `)
      .in('status', ['reported', 'investigating'])
      .order('reported_at', { ascending: false });

    if (error) {
      console.error('Get all lost reports error:', error);
      return { success: false, error: error.message };
    }

    // If you need student details, fetch them separately
    const reportsWithStudentDetails = await Promise.all(
      (reports || []).map(async (report) => {
        if (report.profile?.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('first_name, last_name, phone_number, email')
            .eq('student_id', report.profile.student_id)
            .single();
          
          return { ...report, student };
        }
        return report;
      })
    );

    return { success: true, reports: reportsWithStudentDetails };
  } catch (error) {
    console.error('Get all lost reports error:', error);
    return { success: false, error: 'Failed to fetch lost reports' };
  }
}

/**
 * Get Lost Report Statistics
 */
export async function getLostReportStats(userId = null) {
  try {
    let query = supabase
      .from('lost_reports')
      .select('status', { count: 'exact', head: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get lost report stats error:', error);
      return { success: false, error: error.message };
    }

    // Count by status
    const stats = {
      total: data?.length || 0,
      reported: 0,
      investigating: 0,
      resolved: 0,
    };

    data?.forEach(report => {
      if (stats.hasOwnProperty(report.status)) {
        stats[report.status]++;
      }
    });

    return { success: true, stats };
  } catch (error) {
    console.error('Get lost report stats error:', error);
    return { success: false, error: 'Failed to fetch statistics' };
  }
}

/**
 * Get Lost Report by Item ID
 */
export async function getLostReportByItemId(itemId) {
  try {
    const { data: report, error } = await supabase
      .from('lost_reports')
      .select('*')
      .eq('item_id', itemId)
      .eq('status', 'reported')
      .maybeSingle();

    if (error) {
      console.error('Get lost report by item ID error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, report };
  } catch (error) {
    console.error('Get lost report by item ID error:', error);
    return { success: false, error: 'Failed to fetch lost report' };
  }
}