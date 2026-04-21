# Lost Report Integration Guide

## Overview
This guide shows how to integrate the Lost Report Modal into your existing item pages.

## Files Created

1. **components/LostReportModal.js** - Modal form component
2. **lib/lostReportHelpers.js** - Helper functions for lost reports
3. **database/lost-reports-rls-policies.sql** - Database policies

## Integration Steps

### Step 1: Import Components

```javascript
import LostReportModal from '../../components/LostReportModal';
import { getLostReportForItem } from '../../lib/lostReportHelpers';
```

### Step 2: Add State Variables

```javascript
const [showLostReportModal, setShowLostReportModal] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [existingReport, setExistingReport] = useState(null);
```

### Step 3: Add Function to Open Modal

```javascript
async function handleReportLost(item) {
  setSelectedItem(item);
  
  // Check if item already has a lost report
  const report = await getLostReportForItem(item.id);
  setExistingReport(report);
  
  setShowLostReportModal(true);
}
```

### Step 4: Add Modal to JSX

```javascript
return (
  <View style={styles.container}>
    {/* Your existing content */}
    
    {/* Lost Report Modal */}
    <LostReportModal
      visible={showLostReportModal}
      onClose={() => {
        setShowLostReportModal(false);
        setSelectedItem(null);
        setExistingReport(null);
      }}
      item={selectedItem}
      existingReport={existingReport}
      onSuccess={() => {
        // Refresh items list
        fetchItems();
      }}
    />
  </View>
);
```

### Step 5: Update Item Actions

Replace "Mark as Lost" button with "Report as Lost":

```javascript
{item.status === 'safe' && (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => handleReportLost(item)}
  >
    <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
    <Text style={styles.actionButtonText}>Report as Lost</Text>
  </TouchableOpacity>
)}

{item.status === 'lost' && (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => handleReportLost(item)}
  >
    <Ionicons name="create-outline" size={18} color="#2563eb" />
    <Text style={styles.actionButtonText}>Update Report</Text>
  </TouchableOpacity>
)}
```

## Complete Example: My Items Page

```javascript
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import LostReportModal from '../../components/LostReportModal';
import { getLostReportForItem } from '../../lib/lostReportHelpers';

export default function MyItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLostReportModal, setShowLostReportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [existingReport, setExistingReport] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReportLost(item) {
    setSelectedItem(item);
    
    // Check if item already has a lost report
    const report = await getLostReportForItem(item.id);
    setExistingReport(report);
    
    setShowLostReportModal(true);
  }

  function renderItem({ item }) {
    return (
      <View style={styles.itemCard}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {item.status === 'safe' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReportLost(item)}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
              <Text style={styles.actionButtonText}>Report as Lost</Text>
            </TouchableOpacity>
          )}

          {item.status === 'lost' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReportLost(item)}
            >
              <Ionicons name="create-outline" size={18} color="#2563eb" />
              <Text style={styles.actionButtonText}>Update Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />

      {/* Lost Report Modal */}
      <LostReportModal
        visible={showLostReportModal}
        onClose={() => {
          setShowLostReportModal(false);
          setSelectedItem(null);
          setExistingReport(null);
        }}
        item={selectedItem}
        existingReport={existingReport}
        onSuccess={() => {
          fetchItems();
        }}
      />
    </View>
  );
}

function getStatusStyle(status) {
  const styles = {
    safe: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    lost: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    found: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  };
  return styles[status] || styles.safe;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1611',
  },
  itemCategory: {
    fontSize: 13,
    color: '#8A8070',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 128, 112, 0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1611',
  },
});
```

## Admin Panel Integration

### View All Lost Reports

```javascript
import { getAllLostReports, getStatusColor, formatReportDate } from '../../lib/lostReportHelpers';

export default function AdminLostReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  async function fetchReports() {
    const filters = filter !== 'all' ? { status: filter } : {};
    const data = await getAllLostReports(filters);
    setReports(data);
  }

  function renderReport({ item }) {
    const statusColor = getStatusColor(item.status);
    
    return (
      <View style={styles.reportCard}>
        <Text style={styles.itemName}>{item.item?.name}</Text>
        <Text style={styles.reportedBy}>
          Reported by: {item.user?.full_name}
        </Text>
        
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {item.status}
          </Text>
        </View>

        <Text style={styles.location}>
          Last seen: {item.last_seen_location}
        </Text>
        <Text style={styles.date}>
          {formatReportDate(item.last_seen_date)}
        </Text>
        
        <Text style={styles.circumstances} numberOfLines={2}>
          {item.circumstances}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filters}>
        <TouchableOpacity onPress={() => setFilter('all')}>
          <Text>All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('reported')}>
          <Text>Reported</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('investigating')}>
          <Text>Investigating</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('resolved')}>
          <Text>Resolved</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

## Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Apply RLS policies
\i database/lost-reports-rls-policies.sql
```

## API Usage Examples

### Create Lost Report
```javascript
import { createLostReport } from '../lib/lostReportHelpers';

const report = await createLostReport({
  itemId: 'uuid-here',
  lastSeenLocation: 'Library, 2nd floor',
  lastSeenDate: '2026-04-21',
  circumstances: 'Left it on a table during lunch',
  notes: 'Checked with security office',
});
```

### Get User's Lost Reports
```javascript
import { getUserLostReports } from '../lib/lostReportHelpers';

// All reports
const allReports = await getUserLostReports();

// Only reported status
const reportedOnly = await getUserLostReports('reported');
```

### Update Report
```javascript
import { updateLostReport } from '../lib/lostReportHelpers';

await updateLostReport(reportId, {
  last_seen_location: 'Updated location',
  circumstances: 'Updated circumstances',
});
```

### Resolve Report
```javascript
import { resolveLostReport } from '../lib/lostReportHelpers';

await resolveLostReport(reportId);
```

## Features

✅ **Modal Form** - Clean, user-friendly interface
✅ **Validation** - Required fields enforced
✅ **Edit Mode** - Update existing reports
✅ **RLS Policies** - Secure data access
✅ **Helper Functions** - Easy API integration
✅ **Status Management** - Track report lifecycle
✅ **Admin Access** - View and manage all reports
✅ **Date Formatting** - Human-readable dates
✅ **Status Colors** - Visual status indicators

## Testing Checklist

- [ ] User can open lost report modal
- [ ] Required fields are validated
- [ ] Report saves to database
- [ ] Item status changes to 'lost'
- [ ] User can view existing report
- [ ] User can update report
- [ ] Admin can view all reports
- [ ] RLS policies work correctly
- [ ] Date picker works on all platforms
- [ ] Modal closes properly

---

**Status**: ✅ READY TO INTEGRATE
**Date**: 2026-04-21
