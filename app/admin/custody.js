import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';
import { logCustodyAction, AuditActions } from '../../lib/auditLog';

export default function AdminCustody() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [shelfTag, setShelfTag] = useState('');
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState('received');
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLog(); }, []);

  async function fetchLog() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custody_log')
        .select('*, items(name, category)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching custody log:', error);
        Alert.alert('Error', 'Failed to load custody log. Please try again.');
        setLog([]);
      } else {
        setLog(data || []);
      }
    } catch (err) {
      console.error('Exception fetching custody log:', err);
      Alert.alert('Error', 'An unexpected error occurred while loading custody log.');
      setLog([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchItems(q) {
    setItemSearch(q);
    if (q.length < 2) { setItemResults([]); return; }
    const { data } = await supabase
      .from('items')
      .select('id, name, category, status')
      .ilike('name', `%${q}%`)
      .limit(8);
    setItemResults(data || []);
  }

  function requestLog() {
    if (!selectedItem) { Alert.alert('Select an item first'); return; }
    setConfirm({
      message: `Log "${action}" for ${selectedItem.name}?`,
      detail: action === 'received'
        ? 'Item status will be updated to "at_admin".'
        : action === 'claimed' || action === 'returned'
        ? 'Item status will be updated to "safe".'
        : 'This action will be recorded in the custody log.',
      danger: action === 'disposed',
      onConfirm: handleLog,
    });
  }

  async function handleLog() {
    if (!selectedItem) { Alert.alert('Select an item first'); return; }
    setSaving(true);
    try {
      const custodyData = {
        item_id: selectedItem.id,
        action,
        shelf_tag: shelfTag.trim() || null,
        notes: notes.trim() || null,
      };
      
      // Insert custody log entry
      const { error: custodyError } = await supabase
        .from('custody_log')
        .insert([custodyData]);
      
      if (custodyError) {
        throw new Error(`Failed to create custody log: ${custodyError.message}`);
      }
      
      // Update item status based on action
      if (action === 'received') {
        const { error: statusError } = await supabase
          .from('items')
          .update({ status: 'at_admin' })
          .eq('id', selectedItem.id);
        
        if (statusError) {
          throw new Error(`Failed to update item status: ${statusError.message}`);
        }
      } else if (action === 'claimed' || action === 'returned') {
        const { error: statusError } = await supabase
          .from('items')
          .update({ status: 'safe' })
          .eq('id', selectedItem.id);
        
        if (statusError) {
          throw new Error(`Failed to update item status: ${statusError.message}`);
        }
      }
      
      // Log audit trail
      const auditAction = {
        'received': AuditActions.CUSTODY_RECEIVED,
        'claimed': AuditActions.CUSTODY_CLAIMED,
        'returned': AuditActions.CUSTODY_RETURNED,
        'disposed': AuditActions.CUSTODY_DISPOSED,
      }[action];
      
      await logCustodyAction(auditAction, selectedItem.id, {
        item_name: selectedItem.name,
        action,
        shelf_tag: shelfTag.trim() || null,
        notes: notes.trim() || null,
      });
      
      setShowModal(false);
      setSelectedItem(null);
      setItemSearch('');
      setItemResults([]);
      setShelfTag('');
      setNotes('');
      fetchLog();
      
      Alert.alert('Success', `Custody action "${action}" recorded successfully.`);
    } catch (err) {
      console.error('Error logging custody action:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to record custody action. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  }

  function actionColor(a) {
    return a === 'received' ? '#FB8C00' : a === 'claimed' || a === 'returned' ? '#43A047' : '#E53935';
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Custody Log</Text>
          <Text style={styles.pageSub}>Items physically held at the admin office</Text>
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#1A1611" />
          <Text style={styles.btnPrimaryText}>Log Item</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tableWrap}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cell, styles.headCell, { flex: 2 }]}>Item</Text>
            <Text style={[styles.cell, styles.headCell]}>Category</Text>
            <Text style={[styles.cell, styles.headCell]}>Action</Text>
            <Text style={[styles.cell, styles.headCell]}>Shelf</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Notes</Text>
            <Text style={[styles.cell, styles.headCell]}>Date</Text>
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : log.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>No custody records yet</Text></View>
          ) : log.map((entry) => (
            <View key={entry.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>{entry.items?.name || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{entry.items?.category || '—'}</Text>
              <View style={styles.cell}>
                <View style={[styles.badge, { backgroundColor: actionColor(entry.action) + '20' }]}>
                  <Text style={[styles.badgeText, { color: actionColor(entry.action) }]}>{entry.action}</Text>
                </View>
              </View>
              <Text style={[styles.cell, styles.subCell]}>{entry.shelf_tag || '—'}</Text>
              <Text style={[styles.cell, styles.notesCell]} numberOfLines={1}>{entry.notes || '—'}</Text>
              <Text style={[styles.cell, styles.subCell, { fontSize: 11 }]}>
                {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Custody Action</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#1A1611" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Action</Text>
                <View style={styles.chipGroup}>
                  {['received', 'claimed', 'returned', 'disposed'].map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.chip, action === a && styles.chipActive]}
                      onPress={() => setAction(a)}
                    >
                      <Text style={[styles.chipText, action === a && styles.chipTextActive]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Search Item *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Type item name…"
                  placeholderTextColor="#B8AFA4"
                  value={itemSearch}
                  onChangeText={searchItems}
                />
                {itemResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.resultRow, selectedItem?.id === item.id && styles.resultRowSelected]}
                    onPress={() => { setSelectedItem(item); setItemResults([]); setItemSearch(item.name); }}
                  >
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultSub}>{item.category} · {item.status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Shelf / Location Tag</Text>
                <TextInput style={styles.formInput} placeholder="e.g. Shelf A-3" placeholderTextColor="#B8AFA4" value={shelfTag} onChangeText={setShelfTag} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput style={[styles.formInput, { height: 80 }]} placeholder="Any additional notes…" placeholderTextColor="#B8AFA4" value={notes} onChangeText={setNotes} multiline textAlignVertical="top" />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowModal(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]} onPress={requestLog} disabled={saving}>
                <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Log Action'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ── CONFIRM MODAL ── */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Action</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={{ fontSize: 14, color: '#1A1611', lineHeight: 22 }}>{confirm?.message}</Text>
              {confirm?.detail && <Text style={{ fontSize: 13, color: '#8A8070', marginTop: 6 }}>{confirm.detail}</Text>}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setConfirm(null)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, confirm?.danger && { backgroundColor: '#E53935' }]}
                onPress={() => { confirm?.onConfirm(); setConfirm(null); }}
              >
                <Text style={[styles.btnPrimaryText, confirm?.danger && { color: '#FFFFFF' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5C842', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#1A1611' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0' },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#1A1611' },
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
    borderBottomColor: '#F5F0E8' 
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
  nameCell: { flex: 2, fontWeight: '600', color: '#1A1611', fontSize: 14 },
  notesCell: { flex: 1.5, color: '#5A5248', fontWeight: '500', fontSize: 12 },
  subCell: { color: '#8A8070', fontSize: 12 },
  badge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8070', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(26,22,17,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E0D0' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1611' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, gap: 14 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#E8E0D0', justifyContent: 'flex-end' },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 10, fontWeight: '700', color: '#1A1611', letterSpacing: 1, textTransform: 'uppercase' },
  formInput: { backgroundColor: '#F5F0E8', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0', paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: '#1A1611', outlineWidth: 0 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E8E0D0' },
  chipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  chipTextActive: { color: '#FFFFFF' },
  resultRow: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E0D0', marginTop: 4 },
  resultRowSelected: { borderColor: '#F5C842', backgroundColor: '#FFFBEA' },
  resultName: { fontSize: 13, fontWeight: '600', color: '#1A1611' },
  resultSub: { fontSize: 11, color: '#8A8070', marginTop: 2 },
});
