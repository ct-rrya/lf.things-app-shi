// Audit Logging Utility
// Tracks all admin actions for accountability and security

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Log an admin action to the audit trail
 * @param {Object} params
 * @param {string} params.action - Action performed (e.g., 'student.added', 'item.status_changed')
 * @param {string} params.targetType - Type of entity affected ('student', 'item', 'user', 'custody', etc.)
 * @param {string} params.targetId - UUID of the affected entity
 * @param {Object} params.oldValue - Previous state (optional)
 * @param {Object} params.newValue - New state (optional)
 * @param {string} params.actorId - UUID of admin performing action (optional, defaults to current user)
 */
export async function logAuditAction({
  action,
  targetType,
  targetId,
  oldValue = null,
  newValue = null,
  actorId = null,
}) {
  try {
    // Get current user if actorId not provided
    let actor = actorId;
    if (!actor) {
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      actor = user?.id;
    }

    // Insert audit log entry
    const { error } = await supabaseAdmin
      .from('audit_log')
      .insert([{
        actor_id: actor,
        action,
        target_type: targetType,
        target_id: targetId,
        old_value: oldValue,
        new_value: newValue,
      }]);

    if (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging should not break the main operation
    }
  } catch (err) {
    console.error('Audit log exception:', err);
    // Silent fail - audit logging is important but not critical
  }
}

/**
 * Convenience functions for common audit actions
 */

export const AuditActions = {
  // Student actions
  STUDENT_ADDED: 'student.added',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  STUDENT_STATUS_CHANGED: 'student.status_changed',
  STUDENT_IMPORTED: 'student.imported',

  // Item actions
  ITEM_STATUS_CHANGED: 'item.status_changed',
  ITEM_DELETED: 'item.deleted',
  ITEM_UPDATED: 'item.updated',

  // Custody actions
  CUSTODY_RECEIVED: 'custody.received',
  CUSTODY_CLAIMED: 'custody.claimed',
  CUSTODY_RETURNED: 'custody.returned',
  CUSTODY_DISPOSED: 'custody.disposed',

  // User/Admin actions
  ADMIN_ADDED: 'admin.added',
  ADMIN_REMOVED: 'admin.removed',
  ADMIN_ROLE_CHANGED: 'admin.role_changed',

  // Match actions
  MATCH_MANUALLY_CONFIRMED: 'match.manually_confirmed',
  MATCH_MANUALLY_REJECTED: 'match.manually_rejected',

  // System actions
  BULK_IMPORT: 'system.bulk_import',
  DATA_EXPORT: 'system.data_export',
};

/**
 * Helper to log student changes
 */
export async function logStudentChange(action, studentId, oldData = null, newData = null) {
  await logAuditAction({
    action,
    targetType: 'student',
    targetId: studentId,
    oldValue: oldData,
    newValue: newData,
  });
}

/**
 * Helper to log item changes
 */
export async function logItemChange(action, itemId, oldData = null, newData = null) {
  await logAuditAction({
    action,
    targetType: 'item',
    targetId: itemId,
    oldValue: oldData,
    newValue: newData,
  });
}

/**
 * Helper to log custody changes
 */
export async function logCustodyAction(action, itemId, details = null) {
  await logAuditAction({
    action,
    targetType: 'custody',
    targetId: itemId,
    newValue: details,
  });
}

/**
 * Fetch audit log with filters
 * @param {Object} filters
 * @param {string} filters.actorId - Filter by admin user
 * @param {string} filters.targetType - Filter by entity type
 * @param {string} filters.targetId - Filter by specific entity
 * @param {number} filters.limit - Number of records to fetch
 */
export async function fetchAuditLog({
  actorId = null,
  targetType = null,
  targetId = null,
  limit = 100,
} = {}) {
  try {
    let query = supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actorId) query = query.eq('actor_id', actorId);
    if (targetType) query = query.eq('target_type', targetType);
    if (targetId) query = query.eq('target_id', targetId);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Fetch audit log error:', err);
    return [];
  }
}

/**
 * Get human-readable action description
 */
export function getActionDescription(action, oldValue, newValue) {
  const descriptions = {
    'student.added': 'Added new student',
    'student.updated': 'Updated student information',
    'student.deleted': 'Deleted student',
    'student.status_changed': `Changed status from ${oldValue?.status} to ${newValue?.status}`,
    'student.imported': 'Imported students via CSV',
    'item.status_changed': `Changed item status from ${oldValue?.status} to ${newValue?.status}`,
    'item.deleted': 'Deleted item',
    'item.updated': 'Updated item information',
    'custody.received': 'Received item into custody',
    'custody.claimed': 'Item claimed by owner',
    'custody.returned': 'Item returned to owner',
    'custody.disposed': 'Item disposed',
    'admin.added': 'Added new admin',
    'admin.removed': 'Removed admin',
    'admin.role_changed': `Changed role from ${oldValue?.role} to ${newValue?.role}`,
    'match.manually_confirmed': 'Manually confirmed match',
    'match.manually_rejected': 'Manually rejected match',
    'system.bulk_import': 'Performed bulk import',
    'system.data_export': 'Exported data',
  };

  return descriptions[action] || action;
}
