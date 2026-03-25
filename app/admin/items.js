import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

const STATUS_OPTIONS = ['', 'lost', 'safe', 'recovered', 'at_admin'];

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { fetchItems(); }, [filterStatus]);

  async function fetchItems() {
    setLoading(true);
    try {
      let query = supabase
        .from('items')
        .select('id, name, category, status, created_at, user_id')
        .order('created_at', { ascending: false });
      if (filterStatus) query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(itemId, newStatus) {
    const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', itemId);
    if (error) { Alert.alert('Error', error.message); return; }
    if (newStatus === 'at_admin') {
      await supabase.from('custody_log').insert([{ item_id: itemId, action: 'received' }]);
    }
    fetchItems();
    setShowDetail(false);
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  function statusColor(s) {
    return s === 'lost' ? '#E53935' : s === 'recovered' ? '#43A047' : s === 'at_admin' ? '#FB8C00' : '#8A8070';
  }
  function statusBg(s) {
    return s === 'lost' ? '#FFEBEE' : s === 'recovered' ? '#E8F5E9' : s === 'at_admin' ? '#FFF3E0' : '#F5F0E8';
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>All Items</Text>
          <Text style={styles.pageSub}>{filtered.length} items</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color="#8A8070" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or category…"
            placeholderTextColor="#B8AFA4"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
                {s || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.tableWrap}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            {['Name', 'Category', 'Status', 'Registered', 'Actions'].map(h => (
              <Text key={h} style={[styles.cell, styles.headCell]}>{h}</Text>
            ))}
          </View>
          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>No items found</Text></View>
          ) : filtered.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.cell, styles.subCell]}>{item.category || '—'}</Text>
              <View style={styles.cell}>
                <View style={[styles.badge, { backgroundColor: statusBg(item.status) }]}>
                  <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.cell, styles.subCell]}>{new Date(item.created_at).toLocaleDateString()}</Text>
              <TouchableOpacity
                style={styles.cell}
                onPress={() => { setSelected(item); setShowDetail(true); }}
              >
                <Text style={styles.actionText}>Manage →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Item detail / status update modal */}
      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#1A1611" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalSub}>Category: {selected?.category}</Text>
              <Text style={styles.modalSub}>Current status: <Text style={{ color: statusColor(selected?.status), fontWeight: '700' }}>{selected?.status}</Text></Text>
              <Text style={[styles.formLabel, { marginTop: 16 }]}>Update Status</Text>
              <View style={styles.statusBtns}>
                {['safe', 'lost', 'at_admin', 'recovered'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusBtn, selected?.status === s && { backgroundColor: statusColor(s), borderColor: statusColor(s) }]}
                    onPress={() => updateStatus(selected.id, s)}
                  >
                    <Text style={[styles.statusBtnText, selected?.status === s && { color: '#FFFFFF' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  pageHeader: { padding: 28, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },
  filters: { paddingHorizontal: 28, gap: 10, marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D0', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1611', outlineWidth: 0 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D0' },
  filterChipActive: { backgroundColor: '#1A1611', borderColor: '#1A1611' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8A8070' },
  filterChipTextActive: { color: '#FFFFFF' },
  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden', marginBottom: 24 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  tableHead: { backgroundColor: '#F5F0E8', borderBottomColor: '#E8E0D0' },
  cell: { flex: 1, fontSize: 13 },
  headCell: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 0.8, textTransform: 'uppercase' },
  nameCell: { flex: 2, fontWeight: '600', color: '#1A1611' },
  subCell: { color: '#8A8070' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionText: { fontSize: 12, color: '#5B8CFF', fontWeight: '600' },
  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8070', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(26,22,17,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E0D0' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1611', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, gap: 8 },
  modalSub: { fontSize: 13, color: '#8A8070' },
  formLabel: { fontSize: 10, fontWeight: '700', color: '#1A1611', letterSpacing: 1, textTransform: 'uppercase' },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E0D0', backgroundColor: '#FFFFFF' },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: '#1A1611' },
});
