# Audit Logging System

## Overview

The LF app implements comprehensive audit logging to track all administrative actions for accountability, security, and compliance purposes.

## Features

✅ **Automatic Logging** - All admin actions are automatically logged  
✅ **Detailed Tracking** - Captures before/after states for changes  
✅ **Actor Attribution** - Records which admin performed each action  
✅ **Searchable & Filterable** - Easy to find specific actions  
✅ **Real-time Updates** - Live tracking of system changes  
✅ **Immutable Records** - Audit logs cannot be modified or deleted by admins

## What Gets Logged

### Student Management
- ✅ Student added to master list
- ✅ Student information updated
- ✅ Student status changed (active/inactive/graduated)
- ✅ Student deleted
- ✅ Bulk CSV import

### Item Management
- ✅ Item status changed (lost/safe/at_admin/located)
- ✅ Item deleted
- ✅ Item information updated

### Custody Log
- ✅ Item received into custody
- ✅ Item claimed by owner
- ✅ Item returned to owner
- ✅ Item disposed

### Admin Management
- ✅ Admin user added
- ✅ Admin user removed
- ✅ Admin role changed (staff/admin/superadmin)

### Match Management
- ✅ Match manually confirmed
- ✅ Match manually rejected

### System Actions
- ✅ Bulk data import
- ✅ Data export operations

## Database Schema

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id),  -- Who performed the action
  action      TEXT NOT NULL,                    -- What action was performed
  target_type TEXT,                             -- Type of entity affected
  target_id   UUID,                             -- ID of affected entity
  old_value   JSONB,                            -- State before change
  new_value   JSONB,                            -- State after change
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### Basic Logging

```javascript
import { logAuditAction, AuditActions } from '../../lib/auditLog';

// Log a simple action
await logAuditAction({
  action: AuditActions.STUDENT_ADDED,
  targetType: 'student',
  targetId: studentId,
  newValue: { student_id: '21-12345', full_name: 'Juan Dela Cruz' }
});
```

### Logging Changes (Before/After)

```javascript
// Log a status change
await logAuditAction({
  action: AuditActions.STUDENT_STATUS_CHANGED,
  targetType: 'student',
  targetId: student.id,
  oldValue: { status: 'active', full_name: student.full_name },
  newValue: { status: 'inactive', full_name: student.full_name }
});
```

### Using Helper Functions

```javascript
import { logStudentChange, logItemChange, logCustodyAction } from '../../lib/auditLog';

// Student change
await logStudentChange(
  AuditActions.STUDENT_UPDATED,
  studentId,
  oldData,
  newData
);

// Item change
await logItemChange(
  AuditActions.ITEM_STATUS_CHANGED,
  itemId,
  { status: 'safe' },
  { status: 'lost' }
);

// Custody action
await logCustodyAction(
  AuditActions.CUSTODY_RECEIVED,
  itemId,
  { item_name: 'Laptop', shelf_tag: 'A-3' }
);
```

## Available Actions

### Student Actions
- `AuditActions.STUDENT_ADDED`
- `AuditActions.STUDENT_UPDATED`
- `AuditActions.STUDENT_DELETED`
- `AuditActions.STUDENT_STATUS_CHANGED`
- `AuditActions.STUDENT_IMPORTED`

### Item Actions
- `AuditActions.ITEM_STATUS_CHANGED`
- `AuditActions.ITEM_DELETED`
- `AuditActions.ITEM_UPDATED`

### Custody Actions
- `AuditActions.CUSTODY_RECEIVED`
- `AuditActions.CUSTODY_CLAIMED`
- `AuditActions.CUSTODY_RETURNED`
- `AuditActions.CUSTODY_DISPOSED`

### Admin Actions
- `AuditActions.ADMIN_ADDED`
- `AuditActions.ADMIN_REMOVED`
- `AuditActions.ADMIN_ROLE_CHANGED`

### Match Actions
- `AuditActions.MATCH_MANUALLY_CONFIRMED`
- `AuditActions.MATCH_MANUALLY_REJECTED`

### System Actions
- `AuditActions.BULK_IMPORT`
- `AuditActions.DATA_EXPORT`

## Viewing Audit Logs

### Admin Panel
1. Navigate to **Admin Panel** → **Audit Log**
2. View all logged actions in chronological order
3. Filter by:
   - Entity type (student, item, custody, admin)
   - Search by action, type, or ID
4. Click any entry to view full details including before/after states

### Programmatic Access

```javascript
import { fetchAuditLog } from '../../lib/auditLog';

// Fetch all logs
const logs = await fetchAuditLog();

// Filter by actor
const adminLogs = await fetchAuditLog({ actorId: adminUserId });

// Filter by entity type
const studentLogs = await fetchAuditLog({ targetType: 'student' });

// Filter by specific entity
const itemLogs = await fetchAuditLog({ targetId: itemId });

// Limit results
const recentLogs = await fetchAuditLog({ limit: 50 });
```

## Security & Permissions

### Row Level Security (RLS)

```sql
-- Admins can read audit logs
CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (is_admin());

-- System can insert audit logs (no user can manually insert)
CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);
```

### Key Security Features

- ✅ **Read-only for admins** - Admins can view but not modify logs
- ✅ **System-only writes** - Only the system can create audit entries
- ✅ **No deletion** - Audit logs cannot be deleted
- ✅ **Actor tracking** - Every action is attributed to a specific admin
- ✅ **Immutable records** - Once created, logs cannot be changed

## Best Practices

### 1. Log All State Changes
```javascript
// ❌ Bad - No audit trail
await supabase.from('students').update({ status: 'inactive' }).eq('id', id);

// ✅ Good - With audit trail
const oldData = { status: student.status };
await supabase.from('students').update({ status: 'inactive' }).eq('id', id);
await logStudentChange(AuditActions.STUDENT_STATUS_CHANGED, id, oldData, { status: 'inactive' });
```

### 2. Include Meaningful Context
```javascript
// ❌ Bad - Minimal context
await logAuditAction({
  action: 'student.updated',
  targetId: id
});

// ✅ Good - Rich context
await logAuditAction({
  action: AuditActions.STUDENT_UPDATED,
  targetType: 'student',
  targetId: id,
  oldValue: { email: 'old@email.com', program: 'BSIT' },
  newValue: { email: 'new@email.com', program: 'BSCS' }
});
```

### 3. Use Predefined Actions
```javascript
// ❌ Bad - String literals
await logAuditAction({ action: 'student_added', ... });

// ✅ Good - Predefined constants
await logAuditAction({ action: AuditActions.STUDENT_ADDED, ... });
```

### 4. Don't Block on Audit Failures
```javascript
// The audit logging utility already handles this
// Audit failures are logged but don't throw errors
// This ensures main operations aren't blocked by audit issues
```

## Compliance & Reporting

### Generate Reports

```javascript
// Get all actions by a specific admin
const adminActions = await fetchAuditLog({ actorId: adminId });

// Get all changes to a specific student
const studentHistory = await fetchAuditLog({ 
  targetType: 'student',
  targetId: studentId 
});

// Get recent custody actions
const custodyActions = await fetchAuditLog({ 
  targetType: 'custody',
  limit: 100 
});
```

### Export Audit Data

```javascript
// Fetch and export to CSV
const logs = await fetchAuditLog({ limit: 1000 });
const csv = logs.map(log => ({
  timestamp: log.created_at,
  action: log.action,
  actor: log.actor_id,
  target: `${log.target_type}:${log.target_id}`,
  changes: JSON.stringify({ old: log.old_value, new: log.new_value })
}));
```

## Troubleshooting

### Audit Logs Not Appearing

1. **Check RLS Policies**
   ```sql
   -- Verify admin can read
   SELECT * FROM audit_log LIMIT 1;
   ```

2. **Check Actor ID**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user.id);
   ```

3. **Check Console for Errors**
   ```javascript
   // Audit errors are logged to console
   // Look for "Audit log error:" messages
   ```

### Missing Audit Entries

- Ensure `logAuditAction()` is called AFTER the main operation succeeds
- Check that the action constant is correctly imported
- Verify the target ID is valid

## Future Enhancements

- [ ] Audit log retention policies (auto-archive old logs)
- [ ] Advanced filtering (date ranges, multiple actors)
- [ ] Audit log export to CSV/PDF
- [ ] Real-time audit notifications for critical actions
- [ ] Audit log analytics dashboard
- [ ] Automated compliance reports

## Related Files

- `lib/auditLog.js` - Audit logging utility
- `app/admin/audit.js` - Audit log viewer
- `admin-schema.sql` - Database schema
- `app/admin/students.js` - Example implementation
- `app/admin/custody.js` - Example implementation

---

**Last Updated:** 2024
**Maintained By:** LF Development Team
