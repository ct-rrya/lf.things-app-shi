import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

const STATUS_OPTIONS = ['', 'lost', 'safe', 'at_admin', 'located'];

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchItems();

    // Real-time subscription — updates status live without refresh
    const channel = supabase
      .channel('admin_items_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Admin items subscription error - retrying...');
          setTimeout(() => fetchItems(), 2000);
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => { fetchItems(); }, [filterStatus]);

  async function fetchItems() {
    setLoading(true);
    try {
      let query = supabase
        .from('items')
        .select(`
          id, 
          name, 
          category, 
          status, 
          created_at,
          student_id,
          students:student_id (
            first_name,
            last_name,
            program,
            year_level,
            section
          )
        `)
        .order('created_at', { ascending: false });
        
      if (filterStatus) query = query.eq('status', filterStatus);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching items:', error);
        Alert.alert('Error', 'Failed to load items. Please try again.');
        setItems([]);
      } else {
        // Transform the data to flatten the students object
        const transformedData = (data || []).map(item => ({
          ...item,
          owner_name: item.students 
            ? `${item.students.first_name || ''} ${item.students.last_name || ''}`.trim() || 'Unknown'
            : 'Unknown',
          program: item.students?.program || '—',
          year_section: item.students?.year_level && item.students?.section 
            ? `${item.students.year_level}-${item.students.section}`
            : item.students?.year_level || '—',
        }));
        setItems(transformedData);
      }
    } catch (err) {
      console.error('Exception fetching items:', err);
      Alert.alert('Error', 'An unexpected error occurred while loading items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter(i =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.owner_name || '').toLowerCase().includes(search.toLowerCase())
  );

  function statusColor(s) {
    switch (s) {
      case 'lost':      return '#E53935';
      case 'at_admin':  return '#FB8C00';
      case 'located':   return '#1E88E5';
      default:          return '#8A8070';
    }
  }
  function statusBg(s) {
    switch (s) {
      case 'lost':      return '#FFEBEE';
      case 'at_admin':  return '#FFF3E0';
      case 'located':   return '#E3F2FD';
      default:          return '#F5F0E8';
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>All Items</Text>
          <Text style={styles.pageSub}>
            {loading ? 'Loading…' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
            {'  ·  '}
            <Text style={{ color: '#10b981' }}>Live</Text>
          </Text>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color="#8A8070" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, category, or owner…"
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
        </ScrollView>
      </View>

      <ScrollView style={styles.tableWrap}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Name</Text>
            <Text style={[styles.cell, styles.headCell]}>Category</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Owner</Text>
            <Text style={[styles.cell, styles.headCell]}>Program / Year</Text>
            <Text style={[styles.cell, styles.headCell]}>Status</Text>
            <Text style={[styles.cell, styles.headCell]}>Registered</Text>
          </View>

          {loading ? (
            <View style={styles.emptyRow}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="cube-outline" size={32} color="#E8E0D0" />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          ) : filtered.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.cell, styles.subCell]}>{item.category || '—'}</Text>
              <Text style={[styles.cell, styles.ownerCell]} numberOfLines={1}>{item.owner_name || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]} numberOfLines={1}>
                {[item.program, item.year_section].filter(Boolean).join(' · ') || '—'}
              </Text>
              <View style={styles.cell}>
                <View style={[styles.badge, { backgroundColor: statusBg(item.status) }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColor(item.status) }]} />
                  <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                    {item.status || 'safe'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cell, styles.subCell, { fontSize: 11 }]}>
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  pageHeader: { padding: 28, paddingBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },

  filters: { paddingHorizontal: 28, gap: 10, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
    borderColor: '#E8E0D0', paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1611' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D0',
  },
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
  nameCell: { flex: 1.5, fontWeight: '600', color: '#1A1611', fontSize: 14 },
  ownerCell: { flex: 1.5, color: '#5A5248', fontWeight: '500' },
  subCell: { color: '#8A8070', fontSize: 12 },

  badge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  emptyRow: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: '#8A8070', fontSize: 13 },
});
