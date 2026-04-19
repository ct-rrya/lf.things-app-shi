import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';
import { getActionDescription } from '../../lib/auditLog';

export default function AdminAudit() {
  const [log, setLog] = useState([]); // Start as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Track errors separately
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => { fetchLog(); }, [filterType]);

  async function fetchLog() {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (filterType) query = query.eq('target_type', filterType);
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        console.error('Error fetching audit log:', fetchError);
        setError(fetchError.message || 'Failed to fetch audit log');
        setLog([]);
      } else {
        setLog(data || []);
      }
    } catch (err) {
      console.error('Exception fetching audit log:', err);
      setError(err.message || 'Exception fetching audit log');
      setLog([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = log.filter(entry => {
    if (!entry) return false;
    const searchLower = search.toLowerCase();
    return (
      (entry.action || '').toLowerCase().includes(searchLower) ||
      (entry.target_type || '').toLowerCase().includes(searchLower) ||
      (entry.target_id || '').toLowerCase().includes(searchLower)
    );
  });

  function getActionColor(action) {
    if (!action) return '#5B8CFF'; // Default color if action is undefined
    if (action.includes('deleted') || action.includes('disposed')) return '#E53935';
    if (action.includes('added') || action.includes('received')) return '#43A047';
    if (action.includes('updated') || action.includes('changed')) return '#FB8C00';
    return '#5B8CFF';
  }

  // Show loading state on initial load
  if (loading && log.length === 0 && !error) {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Audit Log</Text>
            <Text style={styles.pageSub}>Loading audit log...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="time-outline" size={48} color="#8A8070" />
          <Text style={styles.loadingText}>Loading audit entries...</Text>
        </View>
      </View>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Audit Log</Text>
            <Text style={[styles.pageSub, { color: '#E53935' }]}>
              Error loading audit log
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E53935" />
          <Text style={styles.errorText}>Unable to load audit log</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLog}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Audit Log</Text>
          <Text style={styles.pageSub}>
            {loading ? 'Loading…' : `${filtered.length} audit entr${filtered.length !== 1 ? 'ies' : 'y'}`}
            {'  ·  '}
            <Text style={{ color: '#10b981' }}>Live Tracking</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLog} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color="#1A1611" />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color="#8A8070" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search actions, types, or IDs…"
            placeholderTextColor="#B8AFA4"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color="#B8AFA4" />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {['', 'student', 'item', 'custody', 'admin'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                  {type || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.tableWrap}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cell, styles.headCell, { flex: 2.5 }]}>Action</Text>
            <Text style={[styles.cell, styles.headCell]}>Type</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Target ID</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Date & Time</Text>
            <Text style={[styles.cell, styles.headCell]}></Text>
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="document-text-outline" size={32} color="#E8E0D0" />
              <Text style={styles.emptyText}>No audit entries found</Text>
            </View>
          ) : filtered.map((entry) => (
            <TouchableOpacity
              key={entry?.id || Math.random()}
              style={styles.tableRow}
              onPress={() => setSelectedEntry(entry)}
              activeOpacity={0.7}
            >
              <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <View style={[styles.actionDot, { backgroundColor: getActionColor(entry?.action) }]} />
                <Text style={styles.actionCell} numberOfLines={1}>{entry?.action || '—'}</Text>
              </View>
              <View style={styles.cell}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{entry?.target_type || '—'}</Text>
                </View>
              </View>
              <Text style={[styles.cell, styles.idCell]} numberOfLines={1}>{entry?.target_id?.substring(0, 8) || '—'}</Text>
              <Text style={[styles.cell, styles.dateCell]}>
                {entry?.created_at ? (
                  <>
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' '}
                    {new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </>
                ) : '—'}
              </Text>
              <View style={styles.cell}>
                <Ionicons name="chevron-forward" size={14} color="#B8AFA4" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedEntry} transparent animationType="fade" onRequestClose={() => setSelectedEntry(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: (getActionColor(selectedEntry?.action) || '#5B8CFF') + '20' }]}>
                  <Ionicons name="document-text" size={18} color={getActionColor(selectedEntry?.action) || '#5B8CFF'} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Audit Entry</Text>
                  <Text style={styles.modalSub}>{selectedEntry?.action || 'No action'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#1A1611" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ACTION</Text>
                <Text style={styles.detailValue}>{selectedEntry?.action}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DESCRIPTION</Text>
                <Text style={styles.detailValue}>
                  {getActionDescription(
                    selectedEntry?.action || '', 
                    selectedEntry?.old_value || null, 
                    selectedEntry?.new_value || null
                  )}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TARGET TYPE</Text>
                <Text style={styles.detailValue}>{selectedEntry?.target_type || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TARGET ID</Text>
                <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 11 }]}>
                  {selectedEntry?.target_id || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ACTOR ID</Text>
                <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 11 }]}>
                  {selectedEntry?.actor_id || 'System'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TIMESTAMP</Text>
                <Text style={styles.detailValue}>
                  {selectedEntry?.created_at ? new Date(selectedEntry.created_at).toLocaleString() : 'N/A'}
                </Text>
              </View>
              {selectedEntry?.old_value && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>OLD VALUE</Text>
                  <View style={styles.jsonBox}>
                    <Text style={styles.jsonText}>{JSON.stringify(selectedEntry.old_value, null, 2)}</Text>
                  </View>
                </View>
              )}
              {selectedEntry?.new_value && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>NEW VALUE</Text>
                  <View style={styles.jsonBox}>
                    <Text style={styles.jsonText}>{JSON.stringify(selectedEntry.new_value, null, 2)}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 28, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0' },
  refreshBtnText: { fontSize: 13, fontWeight: '600', color: '#1A1611' },

  filters: { paddingHorizontal: 28, gap: 10, marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1611' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D0' },
  filterChipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  filterChipTextActive: { color: '#FFFFFF' },

  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E8E0D0', 
    overflow: 'hidden', 
    marginBottom: 24,
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F0E8',
    transition: 'background-color 0.2s',
  },
  tableHead: { 
    backgroundColor: '#FAF8F3', 
    borderBottomWidth: 2,
    borderBottomColor: '#E8E0D0',
    paddingVertical: 12,
  },
  cell: { flex: 1, fontSize: 13 },
  headCell: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#5A5248', 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  actionDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionCell: { fontWeight: '600', color: '#1A1611', flex: 1, fontSize: 14 },
  typeBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#F5C842', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8B830',
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#1A1611', letterSpacing: 0.3 },
  idCell: { color: '#8A8070', fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5 },
  dateCell: { color: '#5A5248', fontSize: 12, fontWeight: '500' },
  emptyRow: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: '#8A8070', fontSize: 13 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#8A8070' },
  
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  errorText: { fontSize: 16, fontWeight: '700', color: '#1A1611' },
  errorSub: { fontSize: 13, color: '#8A8070', textAlign: 'center' },
  retryButton: { marginTop: 12, backgroundColor: '#1A1611', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(26,22,17,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E0D0' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1611' },
  modalSub: { fontSize: 12, color: '#8A8070', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, gap: 16 },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 9, fontWeight: '700', color: '#8A8070', letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1A1611', lineHeight: 20 },
  jsonBox: { backgroundColor: '#F5F0E8', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E0D0' },
  jsonText: { fontSize: 11, fontFamily: 'monospace', color: '#1A1611', lineHeight: 16 },
});
