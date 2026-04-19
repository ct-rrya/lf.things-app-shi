import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*')
      .not('auth_user_id', 'is', null)
      .order('full_name');
    setUsers(data || []);
    setLoading(false);
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.program?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Active Users</Text>
          <Text style={styles.pageSub}>
            {loading ? 'Loading…' : `${users.length} student${users.length !== 1 ? 's' : ''} with accounts`}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#8A8070" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, email, program…"
          placeholderTextColor="#B8AFA4"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#8A8070" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.tableWrap} horizontal={!isWide}>
        <View style={[styles.table, isWide && { minWidth: '100%' }]}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.cell, styles.headCell]}>Student ID</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 2 }]}>Full Name</Text>
            <Text style={[styles.cell, styles.headCell]}>Program</Text>
            <Text style={[styles.cell, styles.headCell]}>Year</Text>
            <Text style={[styles.cell, styles.headCell]}>Section</Text>
            <Text style={[styles.cell, styles.headCell, { flex: 1.5 }]}>Email</Text>
            <Text style={[styles.cell, styles.headCell]}>Joined</Text>
          </View>

          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>
                {search ? 'No results found' : 'No students have created accounts yet'}
              </Text>
            </View>
          ) : filtered.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.tableRow, styles.tableRowTap, selected?.id === u.id && styles.tableRowSelected]}
              onPress={() => setSelected(selected?.id === u.id ? null : u)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cell, styles.idCell]}>{u.student_id}</Text>
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>{u.full_name}</Text>
              <Text style={[styles.cell, styles.subCell]} numberOfLines={1}>{u.program || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{u.year_level || '—'}</Text>
              <Text style={[styles.cell, styles.subCell]}>{u.section || '—'}</Text>
              <Text style={[styles.cell, styles.emailCell]} numberOfLines={1}>{u.email || '—'}</Text>
              <Text style={[styles.cell, styles.subCell, { fontSize: 11 }]}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '—'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Detail panel */}
      {selected && (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailAvatarText}>
                {selected.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selected.full_name}</Text>
              <Text style={styles.detailSub}>{selected.student_id} · {selected.program}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#1A1611" />
            </TouchableOpacity>
          </View>
          <View style={styles.detailGrid}>
            {[
              { label: 'Email', value: selected.email },
              { label: 'Year Level', value: selected.year_level },
              { label: 'Section', value: selected.section },
              { label: 'Status', value: selected.status },
              { label: 'Auth User ID', value: selected.auth_user_id },
              { label: 'Registered', value: selected.created_at ? new Date(selected.created_at).toLocaleString() : '—' },
            ].map(({ label, value }) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{value || '—'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 28, paddingBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070', marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#E8E0D0', paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 28, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1611' },

  tableWrap: { flex: 1, paddingHorizontal: 28 },
  table: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E8E0D0', 
    overflow: 'hidden', 
    marginBottom: 16,
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
  tableRowTap: { backgroundColor: '#FFFFFF' },
  tableRowSelected: { backgroundColor: '#FFF9E6' },

  cell: { flex: 1, fontSize: 13, minWidth: 90 },
  headCell: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#5A5248', 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  idCell: { 
    fontWeight: '700', 
    color: '#1A1611', 
    fontFamily: 'monospace', 
    minWidth: 100,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  nameCell: { flex: 2, fontWeight: '600', color: '#1A1611', minWidth: 140, fontSize: 14 },
  emailCell: { flex: 1.5, color: '#5A5248', fontSize: 12, fontWeight: '500' },
  subCell: { color: '#8A8070', fontSize: 12 },

  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8070', fontSize: 13 },

  // Detail panel
  detailPanel: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E0D0',
    padding: 20, maxHeight: 280,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detailAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(69,53,75,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  detailAvatarText: { fontSize: 18, fontWeight: '800', color: '#1A1611' },
  detailInfo: { flex: 1 },
  detailName: { fontSize: 16, fontWeight: '700', color: '#1A1611' },
  detailSub: { fontSize: 12, color: '#8A8070', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F0E8',
    justifyContent: 'center', alignItems: 'center',
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailRow: { minWidth: '45%', flex: 1 },
  detailLabel: { fontSize: 9, fontWeight: '700', color: '#8A8070', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1A1611' },
});
