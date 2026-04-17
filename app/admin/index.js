import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, items: 0, lost: 0, safe: 0, custody: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const router = useRouter();

  useEffect(() => { fetchStats(); fetchRecentItems(); }, []);

  async function fetchStats() {
    const [students, items, lost, safe, custody] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'lost'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'safe'),
      supabase.from('custody_log').select('*', { count: 'exact', head: true }).eq('action', 'received'),
    ]);
    setStats({
      students: students.count || 0,
      items: items.count || 0,
      lost: lost.count || 0,
      safe: safe.count || 0,
      custody: custody.count || 0,
    });
    setStats({
      students: students.count || 0,
      items: items.count || 0,
      lost: lost.count || 0,
      safe: safe.count || 0,
      custody: custody.count || 0,
    });
  }

  async function fetchRecentItems() {
    const { data } = await supabase
      .from('items')
      .select('id, name, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentItems(data || []);
  }

  const STAT_CARDS = [
    { label: 'Active Students', value: stats.students, icon: 'people', color: '#5B8CFF', bg: '#EEF2FF', route: '/admin/students' },
    { label: 'Total Items', value: stats.items, icon: 'cube', color: '#8A8070', bg: '#F5F0E8', route: '/admin/items' },
    { label: 'Currently Lost', value: stats.lost, icon: 'alert-circle', color: '#E53935', bg: '#FFEBEE', route: '/admin/items' },
    { label: 'Safe', value: stats.safe, icon: 'checkmark-circle', color: '#43A047', bg: '#E8F5E9', route: '/admin/items' },
    { label: 'In Custody', value: stats.custody, icon: 'archive', color: '#FB8C00', bg: '#FFF3E0', route: '/admin/custody' },
  ];

  function statusColor(s) {
    return s === 'lost' ? '#E53935' : s === 'at_admin' ? '#FB8C00' : '#8A8070';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSub}>Overview of the Lost & Found system</Text>
      </View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {STAT_CARDS.map((card) => (
          <TouchableOpacity
            key={card.label}
            style={[styles.statCard, { backgroundColor: card.bg, borderColor: card.color + '30' }]}
            onPress={() => router.push(card.route)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIcon, { backgroundColor: card.color + '20' }]}>
              <Ionicons name={card.icon} size={20} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Items</Text>
          <TouchableOpacity onPress={() => router.push('/admin/items')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHeadText, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}>Category</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}>Status</Text>
            <Text style={[styles.tableCell, styles.tableHeadText]}>Date</Text>
          </View>
          {recentItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tableRow}
              onPress={() => router.push(`/admin/items`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tableCell, styles.tableCellMain, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellSub]}>{item.category}</Text>
              <Text style={[styles.tableCell, { color: statusColor(item.status), fontWeight: '600', fontSize: 12 }]}>
                {item.status}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellSub]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 28, gap: 24 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1A1611' },
  pageSub: { fontSize: 13, color: '#8A8070' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    minWidth: 140, flex: 1,
    borderRadius: 16, padding: 16, gap: 8,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 12, color: '#8A8070', fontWeight: '500' },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1611' },
  seeAll: { fontSize: 13, color: '#F5C842', fontWeight: '600' },

  table: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E8E0D0', overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F0E8',
  },
  tableHead: { backgroundColor: '#F5F0E8', borderBottomColor: '#E8E0D0' },
  tableHeadText: { fontSize: 10, fontWeight: '700', color: '#8A8070', letterSpacing: 0.8, textTransform: 'uppercase' },
  tableCell: { flex: 1, fontSize: 13 },
  tableCellMain: { fontWeight: '600', color: '#1A1611' },
  tableCellSub: { color: '#8A8070' },
});
